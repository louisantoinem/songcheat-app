import React, {Component} from 'react'

// business modules
import {Utils, Player} from 'songcheat-core'

// css
import './Player.css'

class PlayerUI extends Component {

  constructor (props) {
    super(props)
    console.log('Player: getting notes in constructor')
    this.getNotes()
    this.state = {
      countdown: ''
    }
  }

  getNotes () {
    if (this.props.songcheat) {
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
      if (this.player) this.player.stop()
      this.player = new Player(this.props.audioCtx, notes, {
        loop: this.props.rhythm,
        capo: parseInt(this.props.songcheat.capo, 10),
        signature: this.props.songcheat.signature,
        type: this.props.songcheat.wave,
        onDone: () => this.forceUpdate(),
        onCountdown: (c) => this.setState({countdown: c || ''})
      })

      if (this.props.rhythm) this.player.setMode(this.player.MODE_RHYTHM)
    }
  }

  play () {
    this.player.play(this.player.paused || this.props.rhythm ? 0 : 3)
    this.forceUpdate()
  }

  pause () {
    this.player.pause()
    this.forceUpdate()
  }

  stop () {
    this.player.stop()
    this.forceUpdate()
  }

  rewind () {
    this.player.rewind()
    this.forceUpdate()
  }

  tempo (speedpct) {
    this.player.speed(parseInt(speedpct, 10))
    this.forceUpdate()
  }

  volume (volume) {
    this.player.setVolume(parseInt(volume, 10))
    this.forceUpdate()
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(prevProps.units, this.props.units)) {
      if (prevProps.songcheat !== this.props.songcheat) console.log('Player: getting notes because songcheat changed')
      if (!Utils.arraysEqual(prevProps.units, this.props.units)) console.log('Player: getting notes because units changed')
      this.getNotes()
    }
  }

  render () {
    return <div className='Player'>

      <span className='countdown'>{this.state.countdown}</span>

      {
        this.player.stopped ? null : <div className='options'>

          <div>
            <label>Tempo: </label>
            <input type='range' min='1' max='200' value={this.player.speedpct} onInput={(e) => this.tempo(e.target.value)} onChange={(e) => this.tempo(e.target.value)} />
            <span>{this.player.getTempo()} bpm</span>
            <a onClick={() => this.tempo(100)}>Original</a>
          </div>

          <div>
            <label>Volume: </label>
            <input type='range' min='0' max='100' value={this.player.volume} onInput={(e) => this.volume(e.target.value)} onChange={(e) => this.volume(e.target.value)} />
          </div>

        </div>
      }

      <div className='controls'>
        {this.player.stopped || this.player.paused ? <a onClick={() => this.play()}>&#9658;</a> : null}
        {this.player.stopped || this.player.paused ? null : <a onClick={() => this.pause()}>&#10074;&#10074;</a>}
        {this.player.stopped ? null : <a onClick={() => this.stop()}>&#9724;</a>}
        {this.player.stopped ? null : <a onClick={() => this.rewind()}>&#9668;</a>}
      </div>

    </div>
  }
}

export default PlayerUI