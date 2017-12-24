import React, {Component} from 'react'

// components
import AceEditor from 'react-ace'
import './mode-songcheat'
import 'brace/theme/chrome'

class Editor extends Component {

  render () {
    return (
      <AceEditor mode='songcheat' theme='chrome' onChange={(value) => this.props.onChange(value)} name='source' width={this.props.width} maxLines={50} fontSize={18} value={this.props.text} editorProps={{
        $blockScrolling: true
      }} />
    )
  }
}

export default Editor
