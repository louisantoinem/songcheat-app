import React, {Component} from 'react'
import Popup from 'react-popup'
import saveAs from 'save-as'

// components
import AceEditor from 'react-ace'
import './mode-songcheat'
import 'brace/theme/chrome'

class Editor extends Component {

  constructor (props) {
    super(props)
    this.state = { filename: props.filename }
  }

  componentDidMount () {
    let self = this

    let editor = this.refs.ace_editor.editor

    // auto focus
    editor.focus()

    // add save command
    editor.commands.addCommand({
      name: 'saveAs',
      bindKey: {win: 'Ctrl-s', mac: 'Command-s'},
      exec: function (editor) {
        if (!self.state.filename) {
          Popup.plugins().prompt('Enter filename', 'SongCheat.txt', 'Type your name', function (value) {
            let blob = new Blob([editor.getValue()], { type: 'text/plain;charset=utf-8' })
            saveAs(blob, value)
            self.setState({ filename: value })
          })
        } else {
          let blob = new Blob([editor.getValue()], { type: 'text/plain;charset=utf-8' })
          saveAs(blob, self.state.filename)
        }
      }
    })
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.filename !== this.props.filename) this.setState({ filename: nextProps.filename })
  }

  render () {
    return (
      <AceEditor
        ref='ace_editor'
        name='source'
        mode='songcheat'
        theme='chrome'
        width={this.props.width}
        value={this.props.text}
        maxLines={Infinity}
        fontSize={14}
        wrapEnabled
        onCursorChange={this.props.onCursorChange ? (value) => this.props.onCursorChange(value) : null}
        onSelectionChange={this.props.onSelectionChange ? (value) => this.props.onSelectionChange(value) : null}
        onChange={(value) => this.props.onChange(value)}
        editorProps={{
          $blockScrolling: Infinity
        }} />
    )
  }
}

export default Editor
