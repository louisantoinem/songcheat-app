import React, {Component} from 'react'
import ReactResizeDetector from 'react-resize-detector'
import Popup from 'react-popup'

// components
import AceEditor from 'react-ace'
import './mode-songcheat'
import 'brace/theme/chrome'

class Editor extends Component {

  saveAs (editor, quiet) {
    if (this.props.filename) this.props.onSave(editor.getValue(), this.props.filename, quiet)
    else {
      let filename = this.props.defaultFilename ? this.props.defaultFilename() + '.txt' : 'untitled.txt'
      if (this.props.authed()) this.props.onSave(editor.getValue(), filename, quiet)
      else {
        Popup.plugins().prompt('Enter filename', filename, 'Type your name', value => {
          this.props.onSave(editor.getValue(), value, quiet)
          this.props.onFilenameChanged(value)
        })
      }
    }
  }

  componentDidMount () {
    // auto focus
    this.editor.focus()

    // add save command
    this.editor.commands.addCommand({
      name: 'saveAs',
      bindKey: {win: 'Ctrl-s', mac: 'Command-s'},
      exec: editor => this.saveAs(editor)
    })

    // add "quiet save" command (don't update last_modified)
    this.editor.commands.addCommand({
      name: 'quietSaveAs',
      bindKey: {win: 'Ctrl-Shift-s', mac: 'Command-Shift-s'},
      exec: editor => this.saveAs(editor, true)
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
