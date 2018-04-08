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
      let allData = await this.songcheats.find({ owner_id: { $ne: this.stitchClient.authedId() }}).execute()
      let myData = await this.songcheats.find({ owner_id: this.stitchClient.authedId() }).execute()
      this.setState({ allData, myData })
    }
  }

  itemTemplate (item) {
    if (!item) return

    let str = item.title
    if (item.artist) str += ' (' + item.artist + (item.year ? ', ' + item.year : '') + ')'

    return (
      <div className='item' key={item._id}>
        <Link to={'/' + item._id}>{str}</Link>
      </div>
    )
  }

  render () {
    return (<div className='Index' >
      { this.props.authed() && this.state.myData &&
        <div>
          <h1>My SongCheats</h1>
          <Route render={({ history}) => <Button label='Create' icon='fa-plus' className='new' onClick={() => { history.push('/new') }} />} />
          { !this.state.myData.length && <div className='item'><i>(none)</i></div> }
          { this.state.myData.map(item => { return this.itemTemplate(item) })}
        </div>
      }
      { this.state.allData &&
        <div>
          { this.props.authed() && <h1>Other SongCheats</h1> }
          { !this.props.authed() && <h1>All SongCheats</h1> }
          { !this.state.allData.length && <div className='item'><i>(none)</i></div> }
          { this.state.allData.map(item => { return this.itemTemplate(item) })}
        </div>
      }
    </div>
    )
  }
}
