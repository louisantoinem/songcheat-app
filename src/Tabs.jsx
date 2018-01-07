import React, { Component } from 'react'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import 'react-tabs/style/react-tabs.css'

import './Tabs.css'

// components in each tab
import General from './General'
import Chords from './Chords'
import Score from './Score'
import Ascii from './Ascii'

class MyTabs extends Component {

  render () {
    return (<div className='Tabs' />)
  }
}
export default MyTabs
