// react
import React, { Component } from 'react'

// business modules
import {Utils} from 'songcheat-core'

// 3rd party components
import { Menubar } from 'primereact/components/menubar/Menubar'

class LayoutMenu extends Component {

  static _d (direction) {
    if (direction === 'right') return 'right'
    if (direction === 'left') return 'left'
    if (direction === 'down') return 'bottom'
    if (direction === 'up') return 'top'
    throw new Error('LayoutMenu._d: invalid direction ' + direction)
  }

  render () {
    let items = []

    if (this.props.siblingIsLeave) {
      items.push({ icon: 'fa-arrow-circle-o-' + this.props.siblingDirection, label: 'Move ' + Utils.camelCase(this.props.siblingDirection), command: () => { this.props.onMove() }})
    }

    if (this.props.nbComponents > 1) {
      let splitItems = []
      for (let direction of ['left', 'right', 'up', 'down']) {
        splitItems.push({
          icon: 'fa-caret-square-o-' + direction,
          label: Utils.camelCase(LayoutMenu._d(direction), true) + ' panel',
          command: () => { this.props.onSplit(direction) }
        })
      }
      items.push({ icon: 'fa-code-fork', label: 'Detach to new panel', items: splitItems })
    }

    return items.length === 0 ? null : <div style={{margin: '25px'}}><Menubar model={items} /></div>
  }
}

export default LayoutMenu
