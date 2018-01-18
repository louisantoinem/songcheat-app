// react
import React, { Component } from 'react'
import { List } from 'immutable'

// sub components
import LayoutMenu from './LayoutMenu'

// 3rd party components
import SplitPane from 'react-split-pane'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'

// 3rd party css
import './SplitPane.css'
import 'react-tabs/style/react-tabs.css'

class Patchwork extends Component {

  // props.layout is the root node of a tree-like structure
  // each non leave node must have properties 'left' and 'right' or 'top' and 'bottom': child nodes (leave or non leave)
  // each leave node must be an array of the indices of component(s) in this.props.children
  // the root node can also be a leave node

  _renderRec (node, path) {
    // leave node
    if (node.isLeave()) {
      let tabs = []
      let tabPanels = []

      // create a tab and tab panel for each component
      for (let componentIndex of node.components) {
        let component = this.props.children[componentIndex]
        if (!component) throw new Error('Patchwork: cannot find component at index ' + componentIndex)
        const {siblingNode} = this.props.layout._find(path)
        tabs.push(<Tab key={componentIndex}>{component.props.label || '<unnamed>'}</Tab>)
        tabPanels.push(<TabPanel key={componentIndex}>
          {this.props.editLayout &&
            <LayoutMenu
              nbComponents={node.components.length}
              siblingIsLeave={siblingNode && siblingNode.isLeave()}
              siblingDirection={this.props.layout.siblingDirection(path)}
              onMove={() => this.props.onLayoutChanged(this.props.layout.move(path, componentIndex))}
              onSplit={direction => this.props.onLayoutChanged(this.props.layout.split(path, componentIndex, direction))} />}
          <div style={{opacity: this.props.editLayout ? 0.4 : 1}}>{component}</div>
        </TabPanel>)
      }

      // if only one component, just render a full-width div
      if (tabPanels.length === 1) return <div style={{width: '100%'}}>{tabPanels[0].props.children}</div>

      // render full-width controlled Tabs component
      return <Tabs
        style={{width: '100%'}}
        selectedIndex={node.selectedIndex}
        onSelect={selectedTabIndex => this.props.onLayoutChanged(this.props.layout.setSelectedIndex(path, selectedTabIndex))}>
        <TabList>{tabs}</TabList>
        {tabPanels}
      </Tabs>
    }

    // render SplitPane
    return <SplitPane
      split={node.orientation}
      paneStyle={{overflow: 'auto'}}
      defaultSize={node.position}
      onChange={position => this.props.onLayoutChanged(this.props.layout.setPosition(path, position))}>
      {this._renderRec(node.first, path.push('first'))}
      {this._renderRec(node.second, path.push('second'))}
    </SplitPane>
  }

  render () {
    return this.props.clear ? null : this._renderRec(this.props.layout.root, List())
  }
}

export default Patchwork
