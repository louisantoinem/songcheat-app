// react
import React, { Component } from 'react'
import { List, Map } from 'immutable'

// 3rd party components
import SplitPane from 'react-split-pane'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'

// css
import './SplitPane.css'
import 'react-tabs/style/react-tabs.css'

class Patchwork extends Component {

  constructor (props) {
    // props.layout must be the root node of a tree-like structure
    // each non leave node must have properties 'left' and 'right' or 'top' and 'bottom': child nodes (leave or non leave)
    // each leave node must be an array of the indices of component(s) in this.props.children
    // the root node can also be a leave node
    super(props)

    // state keeps selected index in each tabs (key in map is the array of indices of component)
    this.state = { tabIndex: Map() }
  }

  componentWillMount () {
  }

  renderLeave (componentIndices) {
    let tabs = []
    let tabPanels = []
    let component = null

    for (let componentIndex of componentIndices) {
      component = this.props.children[componentIndex]
      if (component) {
        tabs.push(<Tab key={componentIndex}>{component.props.label || '<unnamed>'}</Tab>)
        tabPanels.push(<TabPanel key={componentIndex}>{component}</TabPanel>)
      }
    }

    if (tabPanels.length === 0) throw new Error('Patchwork: layout contains a leave node without any valid component index')
    if (tabPanels.length === 1) return component

    return <Tabs
      style={{width: '100%'}}
      selectedIndex={this.state.tabIndex.get(List(componentIndices)) || 0}
      onSelect={selectedTabIndex => {
        this.setState({ tabIndex: this.state.tabIndex.set(List(componentIndices), selectedTabIndex) })
      }}>
      <TabList>{tabs}</TabList>
      {tabPanels}
    </Tabs>
  }

  renderRec (node) {
    // leave node
    if (node instanceof Array) return this.renderLeave(node)

    // split node
    let split = null
    if (node.left && node.right) split = 'vertical'
    else if (node.top && node.bottom) split = 'horizontal'
    else throw new Error('Patchwork: invalid split node (no left/right nor top/bottom properties)')

    return <SplitPane split={split} paneStyle={{overflow: 'auto'}} defaultSize='50%'>
      {this.renderRec(node.left || node.top)}
      {this.renderRec(node.right || node.bottom)}
    </SplitPane>
  }

  render () {
    return this.renderRec(this.props.layout)
  }
}

export default Patchwork
