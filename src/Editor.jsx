import React, {Component} from 'react'

// components
import AceEditor from 'react-ace'
import './mode-songcheat'
import 'brace/theme/chrome'

class Editor extends Component {

  render () {
    return (
      <AceEditor
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
