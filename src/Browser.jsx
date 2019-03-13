// react
import React, { Component } from 'react'
import { Link, Route } from 'react-router-dom'
import { Map } from 'immutable'

// prime react components
import { Button } from 'primereact/components/button/Button'
import { InputText } from 'primereact/components/inputtext/InputText'
import { Toolbar } from 'primereact/components/toolbar/Toolbar'
import { Checkbox } from 'primereact/components/checkbox/Checkbox'
import { ProgressSpinner } from 'primereact/components/progressspinner/ProgressSpinner'

// 3rd party packages
import timeago from 'time-ago'
import { BSON } from 'mongodb-stitch'
import { Mutex } from 'async-mutex'

// css
import './Browser.css'
import 'primereact/resources/primereact.min.css'
import 'primereact/resources/themes/omega/theme.css'
import 'font-awesome/css/font-awesome.css'

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
      'Search.mine': false,
      'Search.favorite': false,
      'Search:nofork': false
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
      let mine = this.props.authed() ? this.state.settings.get('Search.mine') : false
      let favorite = this.props.authed() ? this.state.settings.get('Search.favorite') : false
      let nofork = this.props.authed() ? this.state.settings.get('Search.nofork') : false
      let what = `${mine ? 'my' : 'all'} ${favorite ? 'favorite documents' : 'documents'} matching "${search}"`
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
            { $or: [ { artist: { $regex: regex } }, { title: { $regex: regex } }, { type: { $regex: regex } }, { source: { $regex: regex } } ]}, // matches search
            { $or: [ { forked_songcheat_id: { $exists: false } }, { owner_id: this.stitchClient.authedId() } ]} // not a fork or this fork belongs to me
          ]
        }
        if (mine) filter.owner_id = this.stitchClient.authedId()
        if (nofork) filter.forked_songcheat_id = { $exists: false }
        let data = await this.songcheats.find(filter).sort({ type: 1, artist: 1, year: 1}).execute()

        // get favorite songcheats for this user by songcheat_id
        let ratings = await this.ratings.find({ user_id: this.stitchClient.authedId() }).execute()
        let favorites = new window.Map()
        for (let rating of ratings) if (rating.favorite) favorites.set(rating.songcheat_id.toString(), true)
        favorites = Map(favorites)
        console.warn(`Done listing ${what}`)
        this.setState({ favorites, data: this.groupByType(data, favorite ? favorites : null) })
      }
    }
  }

  async componentDidMount () {
    this.mutex.runExclusive(() => this.load())
  }

  async componentDidUpdate (prevProps, prevState) {
    if (prevState.settings !== this.state.settings) this.mutex.runExclusive(() => this.load())
  }

  groupByType (data, keep) {
    // initialize result
    let groupedData = {
      length: data.length,
      dataByType: new window.Map()
    }

    // for each fork, find original and ignore it if found
    for (let item of data) if (item.forked_songcheat_id) for (let original_item of data) if (original_item._id.equals(item.forked_songcheat_id)) original_item.ignore = true

    // group by type, keeping only given item ids if any and listing distinct artists on the way
    for (let item of data) {
      if (item.ignore) groupedData.length--
      else if (keep && !keep.get(item._id.toString())) groupedData.length--
      else {
        let type = item.type || '(unknown type)'
        if (!groupedData.dataByType.get(type)) groupedData.dataByType.set(type, { artists: new window.Map(), items: [] })
        groupedData.dataByType.get(type).items.push(item)
        groupedData.dataByType.get(type).artists.set(item.artist, 1)
      }
    }

    // sort types by descending number of items
    groupedData.dataByType = Map(
      Array
        .from(groupedData.dataByType)
        .sort((a, b) => {
          return b[1].items.length - a[1].items.length
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

  itemTemplate (item) {
    if (!item) return
    let created_days = Math.round(Math.abs(((new Date()).getTime() - item.created.getTime()) / (24 * 60 * 60 * 1000)))
    let last_modified_days = Math.round(Math.abs(((new Date()).getTime() - item.last_modified.getTime()) / (24 * 60 * 60 * 1000)))
    return (
      <div title={'Created ' + timeago.ago(item.created) + ' / Modified ' + timeago.ago(item.last_modified)} className={'item' + (created_days <= 30 ? ' created' : '') + (last_modified_days <= 30 ? ' last_modified' : '')} key={item._id}>
        <Link to={'/' + item._id}>
          <span className='artist'>{item.artist + (item.year ? ' (' + item.year + ')' : '')}</span>
          <span className='title'>{item.title} </span>
          <span className='info'><i className='fa fa-edit' /> {timeago.ago(item.last_modified)}</span>
        </Link>
        {this.props.authed() && <i className={'fa fa-star ' + (this.state.favorites.get(item._id.toString()) ? 'favorite' : '')} onClick={() => this.toggleFavorite(item._id)} />}
        {item.forked_songcheat_id && <i className='fa fa-code-fork' />}

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

      <Toolbar>
        <div className='p-toolbar-group-left'>
          <Route render={({ history }) => <Button label='Create' icon='fa fa-plus' onClick={() => { history.push('/new') }} />} />
          <i className='fa fa-search' style={{marginRight: '.25em'}} />
          <InputText onChange={(e) => this.updateSetting('Search.search', e.target.value)} value={this.state.settings.get('Search.search')} placeholder='Search...' style={{width: '30%'}} />
          { this.props.authed() && <Checkbox onChange={(e) => this.updateSetting('Search.mine', e.checked)} checked={this.state.settings.get('Search.mine')} style={{marginLeft: '.25em'}} /> }
          { this.props.authed() && <label>Mine only</label> }
          { this.props.authed() && <Checkbox onChange={(e) => this.updateSetting('Search.favorite', e.checked)} checked={this.state.settings.get('Search.favorite')} style={{marginLeft: '.5em'}} /> }
          { this.props.authed() && <label>Favorites only</label> }
          { this.props.authed() && <Checkbox onChange={(e) => this.updateSetting('Search.nofork', e.checked)} checked={this.state.settings.get('Search.nofork')} style={{marginLeft: '.5em'}} /> }
          { this.props.authed() && <label>Ignore forks</label> }
        </div>
        <div className='p-toolbar-group-right' />
      </Toolbar>

      { !this.state.data && <div className='SpinnerContainer'><ProgressSpinner style={{width: '150px', height: '150px'}} strokeWidth='8' fill='#EEEEEE' animationDuration='1s' /></div> }
      { this.state.data &&
        <div>
          <h2>{this.state.data.length} {this.loaded.get('Search.favorite') ? ' favorite ' : ''} songcheats found {this.loaded.get('Search.search') ? 'matching "' + this.loaded.get('Search.search') + '"' : ''}</h2>
          { this.items(this.state.data.dataByType) }
        </div>
      }
    </div>
    )
  }
}
