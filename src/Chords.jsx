import React, {Component} from 'react'
import {ChordPix} from 'songcheat-core'

class Chords extends Component {

  chordImage (chord) {
    try {
      return <img alt={chord.tablature} title={chord.comment} src={ChordPix.url(chord, 150)} />
    } catch (e) {
      return <p className='error' style={{ margin: '12px' }}>{e.message}</p>
    }
  }

  render () {
    return (<div>
      {
        this.props.chords.map(
          chord => chord.inline
          ? ''
          : <div className='chordDiagram' key={chord.id}>
            {this.chordImage(chord)}
            <p>{chord.comment}</p>
          </div>)
      }
    </div>)
  }
}

export default Chords
