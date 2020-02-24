import { List } from 'immutable'
import { Utils } from 'songcheat-core'

class Layout {

  /**
  Layout API
  ----------

  // create
  layout = new Layout(root)

  // serialize
  str = layout.stringify()
  layout = Layout.fromString(str)

  // check value equality
  bool = layout.equals(layout)

  // immutable API: returns a new Layout instance
  layout = layout.split(path, component, direction)
  layout = layout.merge(path)
  layout = layout.move(path, component)
  layout = layout.select(path, component)
  layout = layout.position(path, component)

  // read-only methods
  layout.display()
  bool = layout.isVisible(component)
  direction = siblingDirection(path)
  */

  constructor (root) {
    // convert from external to internal format
    if (root) this.root = this._convert(root)
  }

  _convert (node) {
    // leave node
    if (node instanceof Array) return new LayoutLeaveNode(node.sort(), 0)

    // split node
    let orientation = null
    if (node.left && node.right) orientation = 'vertical'
    else if (node.top && node.bottom) orientation = 'horizontal'
    else throw new Error('Layout: invalid split node (no left/right nor top/bottom properties)')

    let first = this._convert(node.left || node.top)
    let second = this._convert(node.right || node.bottom)
    return new LayoutSplitNode(first, second, orientation, node.position || '50%')
  }

  static reviver (obj) {
    let instance = new Layout()
    instance.root = obj.root
    return instance
  }

  stringify () {
    return JSON.stringify(this)
  }

  static fromString (str) {
    return Layout.reviver(JSON.parse(str, (key, value) => {
      if (value.first) return LayoutSplitNode.reviver(value)
      if (value.components) return LayoutLeaveNode.reviver(value)
      return value
    }))
  }

  _copy () {
    // create new Layout object on deep copy of our tree
    return Layout.fromString(this.stringify())
  }

  _toString (node, level, prefix) {
    let str = Utils.spaces(level) + prefix + node.toString() + '\n'
    if (node instanceof LayoutSplitNode) {
      str += this._toString(node.first, level + 1, (node.orientation === 'horizontal' ? 'TOP: ' : 'LEFT: '))
      str += this._toString(node.second, level + 1, (node.orientation === 'horizontal' ? 'BOTTOM: ' : 'RIGHT: '))
    }
    return str
  }

  display () {
    console.log(this._toString(this.root, 0, ''))
  }

  equals (other) {
    if (other === this) return true
    if (!(other instanceof Layout)) return false
    return this.stringify() === other.stringify()
  }

  _find (path) {
    // find node at path as well as its parent and sibling
    let node = this.root
    let parentNode = null
    let propInParent = null
    let siblingNode = null
    let siblingPropInParent = null

    for (let prop of path) {
      parentNode = node
      propInParent = prop
      node = parentNode[propInParent]
      siblingPropInParent = (propInParent === 'first' ? 'second' : 'first')
      siblingNode = parentNode[siblingPropInParent]
    }

    return {node, parentNode, propInParent, siblingNode, siblingPropInParent}
  }

  _getAllComponentsRec (node, acc) {
    if (node instanceof LayoutLeaveNode) acc.push(...node.components)
    else {
      this._getAllComponentsRec(node.first, acc)
      this._getAllComponentsRec(node.second, acc)
    }
  }

  _getAllComponents (node) {
    let components = []
    this._getAllComponentsRec(node, components)
    return components.sort()
  }

  _split (path, component, direction) {
    // resolve path
    const {node, parentNode, propInParent} = this._find(path)
    if (!(node instanceof LayoutLeaveNode)) throw new Error('Layout.split: node at path ' + path + ' is not a leave')
    if (node.components.length === 1) throw new Error('Layout.split: node at path ' + path + ' is already a leave containing a single component')

    // remove component from leave node
    node.remove(component)

    // create a new leave node containing only requested component
    let newLeaveNode = new LayoutLeaveNode([component], 0)
    let first = direction === 'left' || direction === 'up' ? newLeaveNode : node
    let second = direction === 'left' || direction === 'up' ? node : newLeaveNode

    // create a new split node with requested component at one side and remaining components at the other side
    let orientation = direction === 'down' || direction === 'up' ? 'horizontal' : 'vertical'
    let newSplitNode = new LayoutSplitNode(first, second, orientation, '50%')

    // replace current leave node with this new split node
    if (parentNode) parentNode[propInParent] = newSplitNode
    else this.root = newSplitNode

    return this
  }

  split (path, componentIndex, direction) {
    // do the split operation on a copy
    return this._copy()._split(path, componentIndex, direction)
  }

  _merge (path) {
    // resolve path
    const {node, parentNode, propInParent} = this._find(path)
    if (node instanceof LayoutLeaveNode) throw new Error('Layout.merge: node at path ' + path + ' is already a leave')

    // create a new leave node with all components
    let newLeaveNode = new LayoutLeaveNode(this._getAllComponents(node), 0)

    // replace current split node with this new leave node
    if (parentNode) parentNode[propInParent] = newLeaveNode
    else this.root = newLeaveNode

    return this
  }

  merge (path) {
    // do the merge operation on a copy
    return this._copy()._merge(path)
  }

  _move (path, component) {
    // resolve path
    const {node, siblingNode} = this._find(path)
    if (!(node instanceof LayoutLeaveNode)) throw new Error('Layout.move: node at path ' + path + ' is not a leave')
    if (!(siblingNode instanceof LayoutLeaveNode)) throw new Error('Layout.move: sibling of node at path ' + path + ' is not a leave')

    // move component from leave node to sibling
    node.remove(component)
    siblingNode.add(component)

    // if leave node is now empty, replace parent with sibling
    if (node.components.length === 0) {
      const {parentNode, propInParent} = this._find(List(path).pop())
      if (parentNode) parentNode[propInParent] = siblingNode
      else this.root = siblingNode
    }

    return this
  }

  move (path, component) {
    // do the move operation on a copy
    return this._copy()._move(path, component)
  }

  _select (path, component) {
    // resolve path
    const {node} = this._find(path)
    if (!(node instanceof LayoutLeaveNode)) throw new Error('Layout.select: node at path ' + path + ' is not a leave')
    node.select(component)
    return this
  }

  select (path, component) {
    // do the select operation on a copy
    return this._copy()._select(path, component)
  }

  _setSelectedIndex (path, selectedIndex) {
    // resolve path
    const {node} = this._find(path)
    if (!(node instanceof LayoutLeaveNode)) throw new Error('Layout.select: node at path ' + path + ' is not a leave')
    node.selectedIndex = selectedIndex
    return this
  }

  setSelectedIndex (path, selectedIndex) {
    // do the select operation on a copy
    return this._copy()._setSelectedIndex(path, selectedIndex)
  }

  _setPosition (path, position) {
    // resolve path
    const {node} = this._find(path)
    if (node instanceof LayoutLeaveNode) throw new Error('Layout.position: node at path ' + path + ' is a leave')
    node.position = position
    return this
  }

  setPosition (path, position) {
    // do the position operation on a copy
    return this._copy()._setPosition(path, position)
  }

  isVisible (component) {
    return this._isVisibleRec(this.root, component)
  }

  _isVisibleRec (node, component) {
    // leave node
    if (node instanceof LayoutLeaveNode) return node.selected() === component

    // split node
    if (this._isVisibleRec(node.first, component)) return true
    if (this._isVisibleRec(node.second, component)) return true

    return false
  }

  siblingDirection (path) {
    const {parentNode, siblingPropInParent} = this._find(path)
    return parentNode ? Layout._direction(siblingPropInParent, parentNode.orientation) : null
  }

  static _direction (prop, orientation) {
    if (prop === 'first') return orientation === 'horizontal' ? 'up' : 'left'
    if (prop === 'second') return orientation === 'horizontal' ? 'down' : 'right'
    throw new Error('Layout._direction: invalid prop ' + prop)
  }

}

class LayoutNode {
  isLeave () {
    return false
  }
}

class LayoutSplitNode extends LayoutNode {
  constructor (first, second, orientation, position) {
    // children must be LayoutNode
    if (!(first instanceof LayoutNode)) throw new Error('LayoutSplitNode: first child is not a LayoutNode')
    if (!(second instanceof LayoutNode)) throw new Error('LayoutSplitNode: second child is not a LayoutNode')

    // orientation is either 'vertical' or 'horizontal'
    if (['horizontal', 'vertical'].indexOf(orientation) < 0) throw new Error('Invalid orientation ' + orientation + ': must be vertical or horizontal')

    // position must be a positive number (or %)
    if (isNaN(parseInt(position, 10)) || parseInt(position, 10) < 0) throw new Error('Invalid position ' + position + ': must be a positive number or %')

    super()
    this.first = first
    this.second = second
    this.orientation = orientation
    this.position = position
  }

  static reviver (obj) {
    return new LayoutSplitNode(obj.first, obj.second, obj.orientation, obj.position)
  }

  toString () {
    return 'SPLIT [' + this.orientation + '@' + this.position + ']'
  }
}

class LayoutLeaveNode extends LayoutNode {
  constructor (components, selectedIndex) {
    super()
    this.components = components
    this.selectedIndex = selectedIndex
  }

  isLeave () {
    return true
  }

  static reviver (obj) {
    return new LayoutLeaveNode(obj.components, obj.selectedIndex)
  }

  toString () {
    let str = 'LEAVE ['
    for (let index = 0; index < this.components.length; index++) str += this.components[index] + (index === this.selectedIndex ? '*' : '') + ' '
    return str.trim() + ']'
  }

  selected () {
    return this.components[this.selectedIndex]
  }

  select (component) {
    this.selectedIndex = Math.max(0, this.components.indexOf(component))
  }

  remove (component) {
    // keep same selectedIndex unless removed component was last in list
    this.components.splice(this.components.indexOf(component), 1)
    this.selectedIndex = Math.min(this.selectedIndex, this.components.length - 1)
  }

  add (component) {
    // new component becomes the selected one
    this.components.push(component)
    this.components.sort()
    this.select(component)
  }
}

export default Layout
