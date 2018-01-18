import React, {Component} from 'react'
import ReactResizeDetector from 'react-resize-detector'
import Popup from 'react-popup'
import saveAs from 'save-as'

// components
import AceEditor from 'react-ace'
import './mode-songcheat'
import 'brace/theme/chrome'

class Editor extends Component {

  componentDidMount () {
    // auto focus
    this.editor.focus()

    // add save command
    this.editor.commands.addCommand({
      name: 'saveAs',
      bindKey: {win: 'Ctrl-s', mac: 'Command-s'},
      exec: editor => {
        if (!this.props.filename) {
          Popup.plugins().prompt('Enter filename', 'SongCheat.txt', 'Type your name', value => {
            let blob = new Blob([editor.getValue()], { type: 'text/plain;charset=utf-8' })
            saveAs(blob, value)
            this.props.onFilenameChanged(value)
          })
        } else {
          let blob = new Blob([editor.getValue()], { type: 'text/plain;charset=utf-8' })
          saveAs(blob, this.props.filename)
        }
      }
    })
  }

  render () {
    return (
      <div>
        <AceEditor
          ref={ed => { this.editor = ed ? ed.editor : null }}
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
        <ReactResizeDetector handleWidth handleHeight onResize={() => { if (this.editor) this.editor.resize() }} />
      </div>
    )
  }
}

export default Editor
