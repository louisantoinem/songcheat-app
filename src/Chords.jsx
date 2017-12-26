import React, {Component} from 'react'
import {ChordPix} from 'songcheat-core'

class Chords extends Component {

  chordUrl (chord) {
    try { return ChordPix.url(chord, 150) } catch (e) { console.warn(e.message) }
    return ''
  }

  render () {
    return (
      <div>
        {this.props.chords.map(chord =>
          <div className='chordDiagram' key={chord.id}>
            <img alt={chord.tablature} title={chord.comment} src={this.chordUrl(chord)} />
            <p>{chord.comment}</p>
          </div>
        )}
      </div>
    )
  }
}

export default Chords
