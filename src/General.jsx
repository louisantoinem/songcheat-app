import React, {Component} from 'react'

import './General.css'

class General extends Component {

  render () {
    return !this.props.songcheat ? null :
    <div className='General'>
      <h1>{this.props.songcheat.title}</h1>
      <h3>{this.props.songcheat.artist}{this.props.songcheat.year ? ', ' + this.props.songcheat.year : ''}</h3>
      <p>{this.props.songcheat.comment}</p>
      <h3>Capo: {this.props.songcheat.capo > 0 ? this.props.songcheat.capo : 'n/a'}</h3>
      <h3>Tuning: {this.props.songcheat.tuning}</h3>
      {/* TODO: Show: difficulty, video, tutorial, key, time, shuffle (with svg image) */}
    </div>
  }
}

export default General
