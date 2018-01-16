class Layout {

  constructor (root) {
    this.root = root
  }

  equals (other) {
    return JSON.stringify(this.root) === JSON.stringify(other.root)
  }

  static _siblingProp (prop) {
    if (prop === 'right') return 'left'
    if (prop === 'left') return 'right'
    if (prop === 'top') return 'bottom'
    if (prop === 'bottom') return 'top'
    throw new Error('Layout._siblingProp: invalid prop ' + prop)
  }

  static _prop (direction) {
    if (direction === 'right') return 'right'
    if (direction === 'left') return 'left'
    if (direction === 'down') return 'bottom'
    if (direction === 'up') return 'top'
    throw new Error('Layout._prop: invalid direction ' + direction)
  }

  static _direction (prop) {
    if (prop === 'right') return 'right'
    if (prop === 'left') return 'left'
    if (prop === 'bottom') return 'down'
    if (prop === 'top') return 'up'
    throw new Error('Layout._direction: invalid prop ' + prop)
  }

  _find (path) {
    // find node at path as well as its parent and sibling
    let node = this.root
    let parentNode = null
    let propInParent = null
    let siblingNode = null

    for (let prop of path) {
      parentNode = node
      propInParent = prop
      siblingNode = node[Layout._siblingProp(prop)]
      node = node[prop]
    }

    return {node, parentNode, propInParent, siblingNode}
  }

  _copy () {
    // create new layout object on deep copy of our tree
    return new Layout(JSON.parse(JSON.stringify(this.root)))
  }

  _children (node) {
    // get both children
    if (node.left && node.right) return [node.left, node.right]
    if (node.top && node.bottom) return [node.top, node.bottom]
    throw new Error('Layout: invalid split node (no left/right nor top/bottom properties)')
  }

  _getAllComponentIndicesRec (node, acc) {
    if (node instanceof Array) acc.push(...node)
    else for (let child of this._children(node)) this._getAllComponentIndicesRec(child, acc)
  }

  _getAllComponentIndices (node) {
    let componentIndices = []
    this._getAllComponentIndicesRec(node, componentIndices)
    return componentIndices.sort()
  }

  _split (path, componentIndex, direction) {
    // resolve path
    const {node, parentNode, propInParent} = this._find(path)
    if (!(node instanceof Array)) throw new Error('Layout.split: node at path ' + path + ' is not a leave')
    if (node.length === 1) throw new Error('Layout.split: node at path ' + path + ' is already a leave containing a single component')

    // remove component from leave node
    node.splice(node.indexOf(componentIndex), 1)

    // create a new split node with request component one side and remaining components at the other side
    let newSplitNode = { [Layout._prop(direction)]: [componentIndex], [Layout._siblingProp(Layout._prop(direction))]: node }

    // replace current leave node with this new split node
    if (parentNode) parentNode[propInParent] = newSplitNode
    else this.root = newSplitNode

    console.log('Layout.split: after split = ' + JSON.stringify(this.root))
    return this
  }

  split (path, componentIndex, direction) {
    // do the split operation on a copy
    return this._copy()._split(path, componentIndex, direction)
  }

  _merge (path, componentIndex) {
    // resolve path
    const {node, parentNode, propInParent} = this._find(path)
    if (node instanceof Array) throw new Error('Layout.merge: node at path ' + path + ' is already a leave')

    // create a new leave node with all components
    let newLeaveNode = this._getAllComponentIndices(node)

    // replace current split node with this new leave node
    if (parentNode) parentNode[propInParent] = newLeaveNode
    else this.root = newLeaveNode

    console.log('Layout.split: after merge = ' + JSON.stringify(this.root))
    return this
  }

  merge (path, componentIndex) {
    // do the merge operation on a copy
    return this._copy()._merge(path, componentIndex)
  }

  _move (path, componentIndex) {
    // resolve path
    const {node, siblingNode} = this._find(path)
    if (!(node instanceof Array)) throw new Error('Layout.move: node at path ' + path + ' is not a leave')
    if (!(siblingNode instanceof Array)) throw new Error('Layout.move: sibling of node at path ' + path + ' is not a leave')

    // remove component from leave node and add to sibling
    node.splice(node.indexOf(componentIndex), 1)
    siblingNode.push(componentIndex)
    siblingNode.sort()

    // if leave node is now empty, replace parent with sibling
    if (node.length === 0) {
      const {parentNode, propInParent} = this._find(path.pop())
      if (parentNode) parentNode[propInParent] = siblingNode
      else this.root = siblingNode
    }

    console.log('Layout.split: after move = ' + JSON.stringify(this.root))
    return this
  }

  move (path, componentIndex) {
    // do the move operation on a copy
    return this._copy()._move(path, componentIndex)
  }

}

export default Layout
