import React, {Component} from 'react'
import {ChordPix} from 'songcheat-core'

import './Chords.css'

class Chords extends Component {

  chordImage (chord) {
    try {
      return <img alt={chord.tablature} title={chord.comment} src={ChordPix.url(chord, 175)} />
    } catch (e) {
      return <p className='error' style={{ margin: '12px' }}>{e.message}</p>
    }
  }

  render () {
    return (<div className='Chords'>
      {
        this.props.chords.map(
          chord => chord.inline
          ? ''
          : <div key={chord.id}>
            {this.chordImage(chord)}
            <p>{chord.comment}</p>
          </div>)
      }
    </div>)
  }
}

export default Chords
