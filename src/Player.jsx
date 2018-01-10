import React, {Component} from 'react'
import {Player} from 'songcheat-core'

import './Player.css'
// import Select from 'react-select'
// import 'react-select/dist/react-select.css'

class PlayerUI extends Component {

  constructor (props) {
    super(props)

    // if no unit given, use all units in song
    let units = this.props.units || this.props.songcheat.structure

    // get notes for units
    let notes = []
    for (let unit of units) {
      for (let phrase of unit.part.phrases) {
        for (let bar of phrase.bars) {
          for (let note of bar.rhythm.compiledScore) {
            let chordedNote = JSON.parse(JSON.stringify(note))
            chordedNote.chord = note.chord || bar.chords[note.placeholderIndex]
            if (!chordedNote.chord) throw new Error('No chord found for placeholder ' + (note.placeholderIndex + 1))
            notes.push(chordedNote)
          }
        }
      }
    }

    // create player on these notes
    this.player = new Player(this.props.audioCtx, notes, {
      loop: this.props.rhythm,
      capo: parseInt(this.props.songcheat.capo, 10),
      signature: this.props.songcheat.signature,
      type: this.props.songcheat.wave
      // onDone: function () { $stopLink.trigger('click') },
      // onCountdown: function (c) { $countdownZone.html(c || '') }
    })

    if (this.props.rhythm) this.player.setMode(this.player.MODE_RHYTHM)
  }

  play () {
    this.player.play(this.player.paused || this.props.rhythm ? 0 : 0 /* 3 */)
  }

  render () {
    return <div className='Player'>
      <a onClick={() => this.play()}>&#9658;</a>
    </div>
  }
}

export default PlayerUI
