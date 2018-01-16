// react
import React, { Component } from 'react'
import { List, Map } from 'immutable'

// business modules
import {Utils} from 'songcheat-core'
import Layout from './Layout'

// prime react components
import { Menubar } from 'primereact/components/menubar/Menubar'

// 3rd party components
import SplitPane from 'react-split-pane'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'

// css
import './SplitPane.css'
import 'react-tabs/style/react-tabs.css'

class Patchwork extends Component {

  constructor (props) {
    super(props)

    this.state = {

      // defaultLayout is the root node of a tree-like structure
      // each non leave node must have properties 'left' and 'right' or 'top' and 'bottom': child nodes (leave or non leave)
      // each leave node must be an array of the indices of component(s) in this.props.children
      // the root node can also be a leave node
      layout: new Layout(this._getStoredLayout(props) || this.props.defaultLayout),

      // tabIndex keeps selected index in each tabs (key in map is the array of indices of component)
      tabIndex: Map()
    }
  }

  _getStoredLayout (props) {
    // get stored layout if any
    let root = localStorage.getItem('Patchwork.' + props.name + '.state.layout.root')
    if (root) try { root = JSON.parse(root) } catch (e) { root = null }
    return root
  }

  _loadLayout (props) {
    this._setLayout(new Layout(this._getStoredLayout(props) || props.defaultLayout), true)
  }

  _setLayout (layout, clear) {
    this.setState({layout: layout}, () => {
      // this ensures SplitPanes are unmounted and re-rendered with their defaultSize
      if (clear) this.setState({ clear: true }, () => this.setState({ clear: false }))
    })
  }

  isDefaultLayout () {
    if (!this.state.layout.equals(new Layout(this.props.defaultLayout))) return false
    for (let index = 0; index < localStorage.length; index++) if (localStorage.key(index).match(new RegExp('^Patchwork.' + this.props.name + '.state.split'))) return false
    return true
  }

  resetLayout () {
    localStorage.removeItem('Patchwork.' + this.props.name + '.state.layout.root')
    for (let index = 0; index < localStorage.length;) {
      if (localStorage.key(index).match(new RegExp('^Patchwork.' + this.props.name + '.state.split'))) localStorage.removeItem(localStorage.key(index))
      else index++
    }
    this._setLayout(new Layout(this.props.defaultLayout), true)
  }

  componentDidUpdate (prevProps, prevState) {
    // persist layout
    if (!prevState.layout.equals(this.state.layout)) {
      this.props.onChange()
      localStorage.setItem('Patchwork.' + this.props.name + '.state.layout.root', JSON.stringify(this.state.layout.root))
    }
  }

  componentWillReceiveProps (nextProps) {
    // name changes: reload stored or default layout
    if (nextProps.name !== this.props.name) this._loadLayout(nextProps)
  }

  isVisible (componentIndex) {
    console.log('Component ' + componentIndex + ' is visible ?')
    return this.props.layout ? this.isVisibleRec(this.props.layout, componentIndex) : false
  }

  isVisibleRec (node, componentIndex) {
    // leave node
    if (node instanceof Array) {
      let componentIndices = node
      let selectedTabIndex = this.state.tabIndex.get(List(node)) || 0
      console.log('Component ' + componentIndices[selectedTabIndex] + ' is visible !')
      if (componentIndices[selectedTabIndex] === componentIndex) return true
      return false
    }

    // split node
    if (this.isVisibleRec(node.left || node.top, componentIndex)) return true
    if (this.isVisibleRec(node.right || node.bottom, componentIndex)) return true

    return false
  }

  renderLeave (componentIndices, path) {
    let tabs = []
    let tabPanels = []

    // create a tab and tab panel for each component
    for (let componentIndex of componentIndices) {
      let component = this.props.children[componentIndex]
      if (!component) throw new Error('Patchwork: cannot find component at index ' + componentIndex)
      const {siblingNode} = this.state.layout._find(path)
      tabs.push(<Tab key={componentIndex}>{component.props.label || '<unnamed>'}</Tab>)
      tabPanels.push(<TabPanel key={componentIndex}>
        {this.props.editable &&
        <LayoutMenu
          nbComponents={componentIndices.length}
          propInParent={path.last()}
          siblingIsLeave={siblingNode instanceof Array}
          onMove={() => this._setLayout(this.state.layout.move(path, componentIndex))}
          onSplit={(direction) => this._setLayout(this.state.layout.split(path, componentIndex, direction))} />}
        {this.props.editable && <div style={{opacity: 0.4}}>{component}</div>}
        {!this.props.editable && component}
      </TabPanel>)
    }

    if (tabPanels.length === 1) return <div style={{width: '100%'}}>{tabPanels[0].props.children}</div>

    // render controlled Tabs component
    return <Tabs
      style={{width: '100%'}}
      selectedIndex={this.state.tabIndex.get(List(componentIndices)) || 0}
      onSelect={selectedTabIndex => { this.setState({ tabIndex: this.state.tabIndex.set(List(componentIndices), selectedTabIndex) }) }}>
      <TabList>{tabs}</TabList>
      {tabPanels}
    </Tabs>
  }

  renderRec (node, path) {
    // leave node
    if (node instanceof Array) return this.renderLeave(node, path)

    // split node
    let split = null
    if (node.left && node.right) split = 'vertical'
    else if (node.top && node.bottom) split = 'horizontal'
    else throw new Error('Patchwork: invalid split node (no left/right nor top/bottom properties)')

    // local storage key for persisting splitter position
    let key = 'Patchwork.' + this.props.name + '.state.split' + (path.size > 0 ? '.' + path.join('.') : '')

    // render split pane with two sides
    return <SplitPane
      split={split}
      paneStyle={{overflow: 'auto'}}
      defaultSize={localStorage.getItem(key) ? parseInt(localStorage.getItem(key), 10) : '50%'}
      onChange={size => {
        localStorage.setItem(key, size)
        this.props.onChange()
      }}>
      {this.renderRec(node.left || node.top, path.push(node.left ? 'left' : 'top'))}
      {this.renderRec(node.right || node.bottom, path.push(node.right ? 'right' : 'bottom'))}
    </SplitPane>
  }

  render () {
    return this.state.clear ? null : this.renderRec(this.state.layout.root, List())
  }
}

class LayoutMenu extends Component {
  render () {
    let items = []

    if (this.props.propInParent && this.props.siblingIsLeave) {
      let direction = Layout._direction(Layout._siblingProp(this.props.propInParent))
      items.push({ icon: 'fa-arrow-circle-o-' + direction, label: 'Move ' + Utils.camelCase(direction), command: () => { this.props.onMove() }})
    }

    if (this.props.nbComponents > 1) {
      let splitItems = []
      for (let direction of ['left', 'right', 'up', 'down']) {
        splitItems.push({
          icon: 'fa-caret-square-o-' + direction,
          label: Utils.camelCase(Layout._prop(direction), true) + ' panel',
          command: () => { this.props.onSplit(direction) }
        })
      }
      items.push({ icon: 'fa-code-fork', label: 'Detach to new panel', items: splitItems })
    }

    return items.length === 0 ? null : <div style={{margin: '25px'}}><Menubar model={items} /></div>
  }
}

export default Patchwork
