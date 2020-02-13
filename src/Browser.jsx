// react
import React, { Component } from 'react'
import { Link, Route } from 'react-router-dom'
import { OrderedMap, Map } from 'immutable'

// prime react components
import { Button } from 'primereact/components/button/Button'
import { InputText } from 'primereact/components/inputtext/InputText'
import { Toolbar } from 'primereact/components/toolbar/Toolbar'
import { Checkbox } from 'primereact/components/checkbox/Checkbox'
import { ProgressSpinner } from 'primereact/components/progressspinner/ProgressSpinner'

// 3rd party components
import Select from 'react-select'

// 3rd party packages
import timeago from 'time-ago'
import { BSON } from 'mongodb-stitch'
import { Mutex } from 'async-mutex'
import { diffChars } from 'diff'

// css
import './Browser.css'
import 'primereact/resources/primereact.min.css'
import 'primereact/resources/themes/omega/theme.css'
import 'font-awesome/css/font-awesome.css'
import 'react-select/dist/react-select.css'

export default class Browser extends Component {

  constructor (props) {
    super(props)
    this.stitchClient = this.props.stitchClient
    this.songcheats = this.props.songcheats
    this.ratings = this.props.ratings
    this.mutex = new Mutex()
    this.loaded = null

    let defaultSettings = {
      'Search.search': '',
      'Search.mode': 'all',
      'Search.favorite': false,
      'Search:nofork': false,
      'Search:sortbycreated': false
    }

    // load stored settings if any
    let settings = localStorage.getItem('SongCheat.Browser.Settings')
    settings = settings ? JSON.parse(settings) : defaultSettings

    // if new settings have been added since they were stored, use their default value
    for (let k in defaultSettings) if (typeof settings[k] === 'undefined') settings[k] = defaultSettings[k]

    this.state = {
      favorites: Map(),
      data: null,
      settings: Map(settings)
    }
  }

  async load () {
    if (this.stitchClient.isAuthenticated()) {
      let search = this.state.settings.get('Search.search')
      let mode = this.props.authed() ? this.state.settings.get('Search.mode') : 'all'
      let favorite = this.props.authed() ? this.state.settings.get('Search.favorite') : false
      let nofork = this.props.authed() ? this.state.settings.get('Search.nofork') : false
      let sortbycreated = this.props.authed() ? this.state.settings.get('Search.sortbycreated') : false
      let what = `${mode.toLowerCase()} ${favorite ? 'favorite documents' : 'documents'} matching "${search}"`
      if (this.loaded === this.state.settings) console.warn(`Already loaded ${what}`)
      else {
        this.setState({ data: null })
        this.loaded = this.state.settings
        console.log(`Listing ${what}`)
        // I keep getting "unknown operator $search", so using a simple OR regexp search
        // let text = { $search: search }
        let regex = BSON.BSONRegExp('.*' + search + '.*', 'i')
        let filter = {
          $and: [
            { $or: [ { artist: { $regex: regex } }, { title: { $regex: regex } }, { type: { $regex: regex } }, { source: { $regex: regex } } ]} // matches search
          ]
        }
        if (mode === 'mine') filter.owner_id = this.stitchClient.authedId()
        if (mode === 'other') filter.owner_id = { $ne: this.stitchClient.authedId()}
        if (nofork) filter.forked_songcheat_id = { $exists: false }
        let sort = sortbycreated ? { created: -1 } : { type: 1, artist: 1, year: 1}
        let data = await this.songcheats.find(filter).sort(sort).execute()

        // get favorite songcheats for this user by songcheat_id
        let ratings = await this.ratings.find({ user_id: this.stitchClient.authedId() }).execute()
        let favorites = new window.Map()
        for (let rating of ratings) if (rating.favorite) favorites.set(rating.songcheat_id.toString(), true)
        favorites = Map(favorites)
        console.warn(`Done listing ${what}`)
        this.setState({ favorites, data: this.groupByCategory(data, favorite ? favorites : null) })
      }
    }
  }

  async componentDidMount () {
    this.mutex.runExclusive(() => this.load())
  }

  async componentDidUpdate (prevProps, prevState) {
    if (prevState.settings !== this.state.settings) this.mutex.runExclusive(() => this.load())
  }

  groupByCategory (data, keep) {
    let sortbycreated = this.props.authed() ? this.state.settings.get('Search.sortbycreated') : false

    // initialize result
    let groupedData = {
      length: data.length,
      dataByCategory: new window.Map()
    }

    // for each fork owned by me, find original and flag it
    for (let item of data) {
      if (item.forked_songcheat_id && item.owner_id === this.stitchClient.authedId()) {
        for (let original_item of data) if (original_item._id.equals(item.forked_songcheat_id)) original_item.forked_by_me = true
      }
    }

    // group by category, keeping only given item ids if any and listing distinct artists on the way
    for (let item of data) {
      if (keep && !keep.get(item._id.toString())) groupedData.length--
      else {
        let category = sortbycreated ? timeago.ago(item.created).replace(/[0-9]+ minutes/, 'minutes').replace(/[0-9]+ hours/, 'hours').replace(/[0-9]+ days/, 'days').replace(/[0-9]+ months/, 'months').replace(/[0-9]+ years/, 'years') : (item.type || '(unknown type)')
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
          return sortbycreated ? b[1].created - a[1].created : b[1].items.length - a[1].items.length
        })
    )

    return groupedData
  }

  async toggleFavorite (songcheat_id) {
    let favorite = !this.state.favorites.get(songcheat_id.toString())
    console.warn('Toggle songcheat ' + songcheat_id + ' to favorite = ' + favorite)
    this.setState({ favorites: this.state.favorites.set(songcheat_id.toString(), favorite) })
    if (!this.props.authed()) throw new Error('Cannot save favorite: not logged in')

    let document = {
      user_id: this.stitchClient.authedId(),
      songcheat_id: songcheat_id,
      favorite: favorite
    }

    return await this.ratings.updateOne({ 'user_id': this.stitchClient.authedId(), 'songcheat_id': songcheat_id }, { '$set': document }, { upsert: true })
  }

  async forkDiff (songcheat_id, forked_songcheat_id) {
    this.setState({indiff: true})
    let original = await this.songcheats.findOne({ '_id': forked_songcheat_id })
    let fork = await this.songcheats.findOne({ '_id': songcheat_id })
    let diff = diffChars(original.source, fork.source)

    // green for additions, red for deletions
    diff.forEach(part => { part.color = part.added ? 'green' : (part.removed ? 'red' : null) })
    this.setState({diff})
  }

  itemTemplate (item) {
    if (!item) return
    let created_days = Math.round(Math.abs(((new Date()).getTime() - item.created.getTime()) / (24 * 60 * 60 * 1000)))
    let last_modified_days = Math.round(Math.abs(((new Date()).getTime() - item.last_modified.getTime()) / (24 * 60 * 60 * 1000)))
    return (
      <div title={'Created ' + timeago.ago(item.created) + ' / Modified ' + timeago.ago(item.last_modified)} className={'item' + (created_days <= 30 ? ' created' : '') + (last_modified_days <= 30 ? ' last_modified' : '') + (item.forked_by_me ? ' forked_by_me' : '')} key={item._id}>
        <Link to={'/' + item._id}>
          <span className='artist'>{item.artist + (item.year ? ' (' + item.year + ')' : '')}</span>
          <span className='title'>{item.title} </span>
          <span className='info'><i className='fa fa-edit' /> {timeago.ago(item.last_modified)}</span>
        </Link>
        {this.props.authed() && <i className={'fa fa-star ' + (this.state.favorites.get(item._id.toString()) ? 'favorite' : '')} onClick={() => this.toggleFavorite(item._id)} />}
        {item.forked_songcheat_id && <i className='fa fa-code-fork' onClick={() => this.forkDiff(item._id, item.forked_songcheat_id)} />}
      </div>
    )
  }

  items (data) {
    let items = []
    for (let entry of data) {
      items.push(<div className='items' key={entry[0]}>
        <h3>{entry[0]}</h3>
        <h4>{entry[1].items.length} {entry[1].items.length > 1 ? 'titles' : 'title'} / {entry[1].artists.size} {entry[1].artists.size > 1 ? 'artists' : 'artist'}</h4>
        { entry[1].items.map(item => { return this.itemTemplate(item) }) }
      </div>)
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

      <Toolbar>
        <div className='p-toolbar-group-left'>

          <div className='optionsRow' style={{marginTop: '3px'}}>
            <Route render={({ history }) => <Button label='Create' icon='fa fa-plus' onClick={() => { history.push('/new') }} />} />
          </div>

          <div className='optionsRow' style={{marginTop: '3px'}}>
            <i className='fa fa-search' style={{marginRight: '.25em'}} />
            <InputText onChange={(e) => this.updateSetting('Search.search', e.target.value)} value={this.state.settings.get('Search.search')} placeholder='Search...' style={{width: '300px'}} />
          </div>

          { this.props.authed() && <div className='optionsRow'>
            <Select
              value={this.state.settings.get('Search.mode')}
              onChange={(selectedOption) => { if (selectedOption) this.updateSetting('Search.mode', selectedOption.value) }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'mine', label: 'Mine' },
                { value: 'other', label: "Other's" }
              ]}
            />
          </div>}

          <div className='optionsRow' style={{marginTop: '7px'}}>
            { this.props.authed() && <Checkbox onChange={(e) => this.updateSetting('Search.favorite', e.checked)} checked={this.state.settings.get('Search.favorite')} style={{marginLeft: '.5em'}} /> }
            { this.props.authed() && <label>Favorites only</label> }
            { this.props.authed() && <Checkbox onChange={(e) => this.updateSetting('Search.nofork', e.checked)} checked={this.state.settings.get('Search.nofork')} style={{marginLeft: '.5em'}} /> }
            { this.props.authed() && <label>Ignore forks</label> }
            { this.props.authed() && <Checkbox onChange={(e) => this.updateSetting('Search.sortbycreated', e.checked)} checked={this.state.settings.get('Search.sortbycreated')} style={{marginLeft: '.5em'}} /> }
            { this.props.authed() && <label>Sort by creation date</label> }
          </div>

        </div>
        <div className='p-toolbar-group-right' />
      </Toolbar>

      { !this.state.data && <div className='SpinnerContainer'><ProgressSpinner style={{width: '150px', height: '150px'}} strokeWidth='8' fill='#EEEEEE' animationDuration='1s' /></div> }
      { this.state.data &&
        <div>
          <h2>{this.state.data.length} {this.loaded.get('Search.favorite') ? ' favorite ' : ''} songcheats found {this.loaded.get('Search.search') ? 'matching "' + this.loaded.get('Search.search') + '"' : ''}</h2>
          { this.items(this.state.data.dataByCategory) }
        </div>
      }
    </div>
    )
  }
}
