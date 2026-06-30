// react
import React, { Component } from 'react'
import { Link, Route } from 'react-router-dom'
import { OrderedMap, Map } from 'immutable'

// 3rd party packages
import timeago from 'time-ago'
import { Mutex } from 'async-mutex'
import { diffChars } from 'diff'

// css
import './Browser.scss'
import 'font-awesome/css/font-awesome.css'

export default class Browser extends Component {

  constructor (props) {
    super(props)
    this.api = this.props.api
    this.mutex = new Mutex()
    this.loaded = null

    let defaultSettings = {
      'Search.search': '',
      'Search.mode': 'all',
      'Search.favorite': false,
      'Search.nofork': false,
      'Search.sortby': 'type' // or 'created' or 'artist'
    }

    // load stored settings if any
    let settings = localStorage.getItem('SongCheat.Browser.Settings')
    settings = settings ? JSON.parse(settings) : defaultSettings

    // if new settings have been added since they were stored, use their default value
    for (let k in defaultSettings) if (typeof settings[k] === 'undefined') settings[k] = defaultSettings[k]

    const storedImageCache = localStorage.getItem('SongCheat.ArtistImages')
    this.artistImageCache = storedImageCache ? JSON.parse(storedImageCache) : {}
    this.searchRef = React.createRef()
    this.state = {
      favorites: Map(),
      data: null,
      artistImages: Map(),
      settings: Map(settings)
    }
  }

  async load () {
    let search = this.state.settings.get('Search.search')
    let mode = this.props.authed() ? this.state.settings.get('Search.mode') : 'all'
    let favorite = this.props.authed() ? this.state.settings.get('Search.favorite') : false
    let nofork = this.props.authed() ? this.state.settings.get('Search.nofork') : false
    let sortby = this.props.authed() ? this.state.settings.get('Search.sortby') : 'type'
    let what = `${mode.toLowerCase()} ${favorite ? 'favorite documents' : 'documents'} matching "${search}"`
    if (this.loaded === this.state.settings) { console.warn(`Already loaded ${what}`); return }

    this.setState({ data: null })
    this.loaded = this.state.settings
    console.log(`Listing ${what}`)

    // the API builds the regex / mode / nofork filter and the sort server-side
    let data = await this.api.listSongcheats({ search, mode, nofork, sortby })

    // get favorite songcheats for this user by songcheat_id (auth required)
    let favorites = new window.Map()
    if (this.props.authed()) {
      let ratings = await this.api.listRatings()
      for (let rating of ratings) if (rating.favorite) favorites.set(rating.songcheat_id, true)
    }
    favorites = Map(favorites)
    console.warn(`Done listing ${what}`)
    const artists = [...new Set(data.map(item => item.artist).filter(Boolean))]
    this.fetchArtistImages(artists)
    this.setState({ favorites, data: this.groupByCategory(data, favorite ? favorites : null) })
  }

  async fetchArtistImages (artists) {
    const toFetch = artists.filter(a => !(a in this.artistImageCache))
    await Promise.all(toFetch.map(async artist => {
      try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artist)}`)
        const json = res.ok ? await res.json() : {}
        this.artistImageCache[artist] = json.thumbnail?.source || null
        localStorage.setItem('SongCheat.ArtistImages', JSON.stringify(this.artistImageCache))
      } catch (e) {
        this.artistImageCache[artist] = null
      }
    }))
    const updates = {}
    for (const artist of artists) if (this.artistImageCache[artist]) updates[artist] = this.artistImageCache[artist]
    if (Object.keys(updates).length > 0) this.setState(prev => ({ artistImages: prev.artistImages.merge(updates) }))
  }

  async componentDidMount () {
    this.mutex.runExclusive(() => this.load())
    document.addEventListener('keydown', this.handleKeyDown)
  }

  componentWillUnmount () {
    document.removeEventListener('keydown', this.handleKeyDown)
  }

  handleKeyDown = (e) => {
    const tag = document.activeElement.tagName
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault()
      this.searchRef.current?.focus()
    }
    if (e.key === 'Escape' && document.activeElement === this.searchRef.current) {
      this.searchRef.current?.blur()
    }
  }

  async componentDidUpdate (prevProps, prevState) {
    if (prevState.settings !== this.state.settings) this.mutex.runExclusive(() => this.load())
  }

  groupByCategory (data, keep) {
    let sortby = this.props.authed() ? this.state.settings.get('Search.sortby') : 'type'

    // initialize result
    let groupedData = {
      length: data.length,
      dataByCategory: new window.Map()
    }

    // for each fork owned by me, find original and flag it
    for (let item of data) {
      if (item.forked_songcheat_id && item.owner_id === this.props.userSub) {
        for (let original_item of data) if (original_item._id === item.forked_songcheat_id) original_item.forked_by_me = true
      }
    }

    // group by category, keeping only given item ids if any and listing distinct artists on the way
    for (let item of data) {
      if (keep && !keep.get(item._id)) groupedData.length--
      else {
        let category = timeago.ago(item.created).replace(/[0-9]+ minutes/, 'minutes').replace(/[0-9]+ hours/, 'hours').replace(/[0-9]+ days/, 'days').replace(/[0-9]+ months/, 'months').replace(/[0-9]+ years/, 'years')
        if (sortby === 'type') category = (item.type || '(unknown type)')
        if (sortby === 'artist') category = (item.artist || '(unknown artist)')
        if (!groupedData.dataByCategory.get(category)) groupedData.dataByCategory.set(category, { artists: new window.Map(), items: [], created: item.created.getTime() })
        groupedData.dataByCategory.get(category).items.push(item)
        groupedData.dataByCategory.get(category).artists.set(item.artist, 1)
      }
    }

    // sort categories by descending number of items or creation date
    groupedData.dataByCategory = OrderedMap(
      Array
        .from(groupedData.dataByCategory)
        .sort((a, b) => {
          if (sortby === 'type') return b[1].items.length - a[1].items.length
          if (sortby === 'artist') return b[1].items.length - a[1].items.length
          return b[1].created - a[1].created
        })
    )

    return groupedData
  }

  async toggleFavorite (songcheat_id) {
    let favorite = !this.state.favorites.get(songcheat_id)
    console.warn('Toggle songcheat ' + songcheat_id + ' to favorite = ' + favorite)
    this.setState({ favorites: this.state.favorites.set(songcheat_id, favorite) })
    if (!this.props.authed()) throw new Error('Cannot save favorite: not logged in')

    return this.api.setFavorite(songcheat_id, favorite)
  }

  async forkDiff (songcheat_id, forked_songcheat_id) {
    this.setState({indiff: true})
    let original = await this.api.getSongcheat(forked_songcheat_id)
    let fork = await this.api.getSongcheat(songcheat_id)
    let diff = diffChars(original.source, fork.source)

    // green for additions, red for deletions
    diff.forEach(part => { part.color = part.added ? 'green' : (part.removed ? 'red' : null) })
    this.setState({diff})
  }

  avatarInitials (artist) {
    if (!artist) return '?'
    return artist.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  avatarColor (artist) {
    if (!artist) return '#999'
    let hash = 0
    for (let c of artist) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
    return `hsl(${Math.abs(hash) % 360}, 52%, 50%)`
  }

  itemTemplate (item, index = 0) {
    if (!item) return
    let created_days = Math.round(Math.abs(((new Date()).getTime() - item.created.getTime()) / (24 * 60 * 60 * 1000)))
    let last_modified_days = Math.round(Math.abs(((new Date()).getTime() - item.last_modified.getTime()) / (24 * 60 * 60 * 1000)))
    const recencyPct = Math.round((1 - last_modified_days / 30) * 100)
    const isRecent = last_modified_days <= 30
    const classNames = ['item', created_days <= 30 && 'created', isRecent && 'last_modified', item.forked_by_me && 'forked_by_me'].filter(Boolean).join(' ')
    return (
      <div title={'Created ' + timeago.ago(item.created) + ' / Modified ' + timeago.ago(item.last_modified)} className={classNames} style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }} key={item._id}>
        <div className='item-avatar' style={this.state.artistImages.get(item.artist) ? {} : { background: this.avatarColor(item.artist) }}>
          {this.state.artistImages.get(item.artist)
            ? <img src={this.state.artistImages.get(item.artist)} alt={item.artist} />
            : this.avatarInitials(item.artist)
          }
        </div>
        <div className='item-body'>
          {this.props.authed() && <i className={'fa fa-star item-star' + (this.state.favorites.get(item._id) ? ' favorite' : '')} onClick={() => this.toggleFavorite(item._id)} />}
          {item.forked_songcheat_id && <i className='fa fa-code-fork item-fork' onClick={() => this.forkDiff(item._id, item.forked_songcheat_id)} />}
          <Link to={'/' + item._id}>
            <span className='artist'>{item.artist}{item.year && <span className='year'>{item.year}</span>}</span>
            <span className='title'>{item.title}</span>
            <span className='info'><i className='fa fa-clock-o' /> {timeago.ago(item.last_modified)}</span>
          </Link>
        </div>
        {isRecent && <div className='recency-bar' style={{ width: `${recencyPct}%` }} />}
      </div>
    )
  }

  items (data) {
    let items = []
    let cardIndex = 0
    for (let entry of data) {
      items.push(
        <div className='category' key={entry[0]}>
          <div className='category-header'>
            <h3>{entry[0]}</h3>
            <span className='category-meta'>{entry[1].items.length} {entry[1].items.length > 1 ? 'titles' : 'title'} · {entry[1].artists.size} {entry[1].artists.size > 1 ? 'artists' : 'artist'}</span>
          </div>
          <div className='items-grid'>
            {entry[1].items.map(item => this.itemTemplate(item, cardIndex++))}
          </div>
        </div>
      )
    }
    return items
  }

  // Update settings in response to user input
  updateSetting (key, value) {
    let settings = this.state.settings.set(key, value)
    this.setState({settings})
    localStorage.setItem('SongCheat.Browser.Settings', JSON.stringify(settings))
  }

  render () {
    // set document title
    document.title = 'SongCheat'

    return (<div className='Index' >

      {this.state.indiff && <div className='diff'>
        <div className='close'><i className='fa fa-times' onClick={() => this.setState({indiff: false, diff: null})} /></div>
        {!this.state.diff && <div className='loading'>Loading...</div>}
        {this.state.diff && <div className='contents'>
          {this.state.diff.map(entry => <span className={entry.color}>{entry.value}</span>)}
        </div>}
      </div>}

      <div className='filter-bar'>
        <Route render={({ history }) => (
          <button className='btn-create' onClick={() => history.push('/new')}>
            <i className='fa fa-plus' /> Create
          </button>
        )} />

        <div className='search-input-wrap'>
          <i className='fa fa-search' />
          <input
            ref={this.searchRef}
            type='text'
            placeholder='Search... ( / )'
            value={this.state.settings.get('Search.search')}
            onChange={(e) => this.updateSetting('Search.search', e.target.value)}
          />
        </div>

        {this.props.authed() && (
          <div className='toggle-group'>
            {[['all', 'All'], ['mine', 'Mine'], ['other', "Other's"]].map(([val, label]) => (
              <button key={val} className={'toggle-btn' + (this.state.settings.get('Search.mode') === val ? ' active' : '')} onClick={() => this.updateSetting('Search.mode', val)}>
                {label}
              </button>
            ))}
          </div>
        )}

        {this.props.authed() && (
          <div className='toggle-group'>
            {[['type', 'By type'], ['created', 'By date'], ['artist', 'By artist']].map(([val, label]) => (
              <button key={val} className={'toggle-btn' + (this.state.settings.get('Search.sortby') === val ? ' active' : '')} onClick={() => this.updateSetting('Search.sortby', val)}>
                {label}
              </button>
            ))}
          </div>
        )}

        {this.props.authed() && (
          <div className='chip-group'>
            <button className={'chip' + (this.state.settings.get('Search.favorite') ? ' active' : '')} onClick={() => this.updateSetting('Search.favorite', !this.state.settings.get('Search.favorite'))}>
              <i className='fa fa-star' /> Favorites
            </button>
            <button className={'chip' + (this.state.settings.get('Search.nofork') ? ' active' : '')} onClick={() => this.updateSetting('Search.nofork', !this.state.settings.get('Search.nofork'))}>
              <i className='fa fa-code-fork' /> No forks
            </button>
          </div>
        )}
      </div>

      {!this.state.data && (
        <div className='skeleton-grid'>
          {Array.from({ length: 12 }).map((_, i) => (
            <div className='skeleton-card' key={i}>
              <div className='sk-avatar' />
              <div className='sk-body'>
                <div className='sk-line sk-artist' />
                <div className='sk-line sk-title' />
                <div className='sk-line sk-info' />
              </div>
            </div>
          ))}
        </div>
      )}

      {this.state.data && (
        <div>
          <div className='results-summary'>
            <span className='results-count'>{this.state.data.length}</span>
            <span className='results-label'>{this.loaded.get('Search.favorite') ? ' favorite' : ''} songcheat{this.state.data.length !== 1 ? 's' : ''}</span>
            {this.loaded.get('Search.search') && (
              <>
                <span className='results-query'>matching "{this.loaded.get('Search.search')}"</span>
                <button className='results-clear' onClick={() => this.updateSetting('Search.search', '')} title='Clear search'>
                  <i className='fa fa-times' />
                </button>
              </>
            )}
          </div>

          {this.state.data.length === 0
            ? (
              <div className='empty-state'>
                <i className='fa fa-music' />
                <p>No songcheats found</p>
                {this.loaded.get('Search.search') && (
                  <button onClick={() => this.updateSetting('Search.search', '')}>
                    Clear search
                  </button>
                )}
              </div>
            )
            : this.items(this.state.data.dataByCategory)
          }
        </div>
      )}
    </div>
    )
  }
}
