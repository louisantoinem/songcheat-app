import Layout from './Layout'

it('tests Layout API', () => {
  let root = {left: [5], right: {bottom: {right: [1], left: [2, 0, 6, 7]}, top: {right: [4], left: [3]}}}
  let path = ['second', 'second', 'first']

  // create
  let layout = new Layout(root)
  let original = layout

  // (un)serialize
  let str = layout.stringify()
  layout = Layout.fromString(str)
  expect(layout === original).toBe(false)
  expect(layout.equals(original)).toBe(true)
  original = layout

  // extract component 2 to a separate top panel
  layout = layout.split(path, 2, 'up')
  expect(layout.equals(original)).toBe(false)

  // undo this split, back to original
  layout = layout.merge(path)
  expect(layout.equals(original)).toBe(true)

  // move component 2 to sibling node
  layout = layout.move(path, 2)
  expect(layout.equals(original)).toBe(false)

  // component 2 has been automatically selected
  expect(layout.isVisible(2)).toBe(true)

  // select component 6
  expect(layout.isVisible(6)).toBe(false)
  layout = layout.select(path, 6)
  expect(layout.isVisible(6)).toBe(true)

  // display
  layout.display()
})
