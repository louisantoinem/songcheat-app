// react
import React, { Component } from 'react'
import { Link, Route } from 'react-router-dom'

// prime react components
import { Button } from 'primereact/components/button/Button'

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
    this.state = {
      data: null
    }
  }

  async componentDidMount () {
    if (this.stitchClient.isAuthenticated()) {
      let allData = await this.songcheats.find({ owner_id: { $ne: this.stitchClient.authedId() }}).sort({'type': 1, 'artist': 1, 'year': 1}).execute()
      let myData = await this.songcheats.find({ owner_id: this.stitchClient.authedId() }).sort({'type': 1, 'artist': 1, 'year': 1}).execute()
      allData = this.groupByType(allData)
      myData = this.groupByType(myData)
      this.setState({ allData, myData })
    }
  }

  groupByType (data) {
    let lastType = null
    let groupedData = { length: data.length, dataByType: new Map() }

    for (let item of data) {
      let type = item.type || '(unknown type)'
      if (type !== lastType) {
        groupedData.dataByType.set(type, { artists: new Map(), items: [] })
        lastType = type
      }

      groupedData.dataByType.get(type).items.push(item)
      groupedData.dataByType.get(type).artists.set(item.artist, 1)
    }

    // sort types by descending number of items
    groupedData.dataByType = new Map(
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
    let daysOld = Math.round(Math.abs(((new Date()).getTime() - item.last_modified.getTime()) / (24 * 60 * 60 * 1000)))
    let str = (item.artist ? item.artist + ' - ' : '') + item.title + (item.year ? ' (' + item.year + ')' : '')
    return (
      <div className={'item' + (daysOld <= 7 ? ' new week' : (daysOld <= 30 ? ' new month' : ''))} key={item._id}>
        <Link to={'/' + item._id}>{str}</Link>
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

  render () {
    // set document title
    document.title = 'SongCheat'

    return (<div className='Index' >
      { this.props.authed() && this.state.myData &&
        <div>
          <h1>My SongCheats ({this.state.myData.length})</h1>
          <Route render={({ history}) => <Button label='Create' icon='fa-plus' className='new' onClick={() => { history.push('/new') }} />} />
          { this.items(this.state.myData.dataByType) }
        </div>
      }
      { this.state.allData &&
        <div>
          { this.props.authed() && <h1>Other SongCheats ({this.state.allData.length})</h1> }
          { !this.props.authed() && <h1>All SongCheats ({this.state.allData.length})</h1> }
          { this.items(this.state.allData.dataByType) }
        </div>
      }
    </div>
    )
  }
}
