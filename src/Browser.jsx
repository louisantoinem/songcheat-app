// react
import React, { Component } from 'react'
import { Link, Route } from 'react-router-dom'
import { Map } from 'immutable'

// prime react components
import { Button } from 'primereact/components/button/Button'
import { InputText } from 'primereact/components/inputtext/InputText'
import { Toolbar } from 'primereact/components/toolbar/Toolbar'
import { Checkbox } from 'primereact/components/checkbox/Checkbox'

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
    this.mutex = new Mutex()
    this.loaded = null

    let defaultSettings = {
      'Search.search': '',
      'Search.mine': false
    }

    // load stored settings if any
    let settings = localStorage.getItem('SongCheat.Browser.Settings')
    settings = settings ? JSON.parse(settings) : defaultSettings

    // if new settings have been added since they were stored, use their default value
    for (let k in defaultSettings) if (typeof settings[k] === 'undefined') settings[k] = defaultSettings[k]

    this.state = {
      data: null,
      settings: Map(settings)
    }
  }

  async load () {
    if (this.stitchClient.isAuthenticated()) {
      let search = this.state.settings.get('Search.search')
      let mine = this.state.settings.get('Search.mine')
      let what = `${mine ? 'my documents' : 'all documents'} matching "${search}"`
      if (this.loaded === this.state.settings) console.warn(`Already loaded ${what}`)
      else {
        this.loaded = this.state.settings
        console.log(`Listing ${what}`)
        // I keep getting "unknown operator $search", so using a simple OR regexp search
        // let text = { $search: search }
        let regex = BSON.BSONRegExp('.*' + search + '.*', 'i')
        let or = [ { artist: { $regex: regex } }, { title: { $regex: regex } }, { type: { $regex: regex } }, { source: { $regex: regex } } ]
        let sort = { type: 1, artist: 1, year: 1}
        let data = await this.songcheats.find(mine ? { owner_id: this.stitchClient.authedId(), $or: or } : { $or: or }).sort(sort).execute()
        console.warn(`Done listing ${what}`)
        this.setState({ data: this.groupByType(data) })
      }
    }
  }

  async componentDidMount () {
    this.load()
  }

  async componentDidUpdate (prevProps, prevState) {
    if (prevState.settings !== this.state.settings) this.mutex.runExclusive(() => this.load())
  }

  groupByType (data) {
    let lastType = null
    let groupedData = { length: data.length, dataByType: new window.Map() }

    for (let item of data) {
      let type = item.type || '(unknown type)'
      if (type !== lastType) {
        groupedData.dataByType.set(type, { artists: new window.Map(), items: [] })
        lastType = type
      }

      groupedData.dataByType.get(type).items.push(item)
      groupedData.dataByType.get(type).artists.set(item.artist, 1)
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

  itemTemplate (item) {
    if (!item) return
    let created_days = Math.round(Math.abs(((new Date()).getTime() - item.created.getTime()) / (24 * 60 * 60 * 1000)))
    let last_modified_days = Math.round(Math.abs(((new Date()).getTime() - item.last_modified.getTime()) / (24 * 60 * 60 * 1000)))
    return (
      <div title={'Created ' + timeago.ago(item.created) + ' / Modified ' + timeago.ago(item.last_modified)} className={'item' + (created_days <= 30 ? ' created' : '') + (last_modified_days <= 30 ? ' last_modified' : '')} key={item._id}>
        <Link to={'/' + item._id}>
          <span className='artist'>{item.artist + (item.year ? ' (' + item.year + ')' : '')}</span>
          <span className='title'>{item.title}</span>
          <span className='info'><i className='fa fa-edit' /> {timeago.ago(item.last_modified)}</span>
        </Link>
      </div>
    )
  }

  items (data) {
    let items = []
    for (let row of data) {
      items.push(<div className='items' key={row[0]}>
        <h3>{row[0]}</h3>
        <h4>{row[1].items.length} {row[1].items.length > 1 ? 'titles' : 'title'} / {row[1].artists.size} {row[1].artists.size > 1 ? 'artists' : 'artist'}</h4>
        { row[1].items.map(item => { return this.itemTemplate(item) }) }
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
        </div>
        <div className='p-toolbar-group-right' />
      </Toolbar>

      { this.state.data &&
        <div>
          <h2>{this.state.data.length} songcheats found {this.loaded.get('Search.search') ? 'matching "' + this.loaded.get('Search.search') + '"' : ''}</h2>
          { this.items(this.state.data.dataByType) }
        </div>
      }
    </div>
    )
  }
}
