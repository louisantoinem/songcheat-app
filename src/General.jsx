import React, {Component} from 'react'

import './General.css'

class General extends Component {

  render () {
    return <div className='General'>
      <h1>{this.props.songcheat.title}</h1>
      <h2>{this.props.songcheat.artist}, {this.props.songcheat.year}</h2>
      <p>{this.props.songcheat.comment}</p>
      <h3>Tempo: {this.props.songcheat.signature.tempo} bpm</h3>
      <h3>Capo: {this.props.songcheat.capo > 0 ? this.props.songcheat.capo : 'n/a'}</h3>
      <h3>Tuning: {this.props.songcheat.tuning}</h3>
      {/* TODO: Show: difficulty, video, tutorial, key, time, shuffle (svg) */}

    </div>
  }
}

export default General
