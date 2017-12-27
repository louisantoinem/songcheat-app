import React, {Component} from 'react'

// components
import AceEditor from 'react-ace'
import './mode-songcheat'
import 'brace/theme/chrome'

class Editor extends Component {

  componentDidMount () {
    this.refs.ace_editor.editor.focus()
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
