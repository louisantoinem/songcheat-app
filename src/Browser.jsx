// react
import React, { Component } from 'react'
import { Link } from 'react-router-dom'

// prime react components
import { DataList } from 'primereact/components/datalist/DataList'

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
      let allData = await this.songcheats.find().execute()
      let myData = await this.songcheats.find({ owner_id: this.stitchClient.authedId() }).execute()
      myData.splice(0, 0, { title: '(CREATE NEW)', _id: 'new' })
      this.setState({ allData, myData })
    }
  }

  itemTemplate (item) {
    if (!item) return

    let str = item.title
    if (item.artist) str += ' (' + item.artist + (item.year ? ', ' + item.year : '') + ')'

    return (
      <div className='item'>
        <Link to={'/' + item._id}>{str}</Link>
      </div>
    )
  }

  render () {
    return (<div className='Index' >
      { this.props.authed() && this.state.myData && <DataList value={this.state.myData} itemTemplate={item => { return this.itemTemplate(item) }} header='My SongCheats' /> }
      { this.state.allData && <DataList value={this.state.allData} itemTemplate={item => { return this.itemTemplate(item) }} header='All SongCheats' /> }
    </div>
    )
  }
}
