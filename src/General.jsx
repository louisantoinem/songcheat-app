import React, {Component} from 'react'
import ReactPlayer from 'react-player'

import './General.css'

class General extends Component {

  render () {
    return !this.props.songcheat ? null :
    <div className='General'>
      <h1>{this.props.songcheat.title}</h1>
      <h3>{this.props.songcheat.artist}{this.props.songcheat.year ? ', ' + this.props.songcheat.year : ''}</h3>
      <p>{this.props.songcheat.comment}</p>

      {this.props.songcheat.video && <div>
        {ReactPlayer.canPlay(this.props.songcheat.video) && <ReactPlayer controls url={this.props.songcheat.video} />}
        {!ReactPlayer.canPlay(this.props.songcheat.video) && <a target='blank_' href={this.props.songcheat.video} >{this.props.songcheat.video}</a>}
      </div>}

      <p><b>Signature</b> {this.props.songcheat.signature.time.symbol.replace(/\//, ':')} / <b>Tempo</b> {this.props.songcheat.signature.tempo} bpm {!this.props.songcheat.signature.shuffle ? '' : (this.props.songcheat.signature.shuffle === ':4' ? '/ Shuffled quarter notes' : '/ Shuffled ' + this.props.songcheat.signature.shuffle.substr(1) + 'th notes')}
        {this.props.songcheat.signature.shuffle === ':8' && <img width='60' style={{display: 'inline', marginLeft: '10px'}} alt='shuffled 8th' src='/shuffle_8th.svg' />}
      </p>

      <p><b>Key</b> {this.props.songcheat.signature.key} / <b>Tuning</b> {this.props.songcheat.tuning.toString()} / <b>Capo</b> {this.props.songcheat.capo > 0 ? this.props.songcheat.capo : '0'}</p>

      <p><b>Difficulty</b> {this.props.songcheat.difficulty}/5</p>

      {this.props.songcheat.tutorial && <div>
          {ReactPlayer.canPlay(this.props.songcheat.tutorial) && <ReactPlayer controls url={this.props.songcheat.tutorial} />}
          {!ReactPlayer.canPlay(this.props.songcheat.tutorial) && <p>Tutorial: <a target='blank_' href={this.props.songcheat.tutorial} >{this.props.songcheat.tutorial}</a></p>}
        </div>}

      {this.props.songcheat.source && <div>
        {ReactPlayer.canPlay(this.props.songcheat.source) && <ReactPlayer controls url={this.props.songcheat.source} />}
        {!ReactPlayer.canPlay(this.props.songcheat.source) && <p>Source: <a target='blank_' href={this.props.songcheat.source} >{this.props.songcheat.source}</a></p>}
      </div>}

    </div>
  }
}

export default General
