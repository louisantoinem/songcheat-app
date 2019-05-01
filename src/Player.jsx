import React, {Component} from 'react'

// business modules
import {Utils, Duration, Player, Score, waveTables} from 'songcheat-core'

// 3rd party components
import {RadioButton} from 'primereact/components/radiobutton/RadioButton'

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

      // concat score of units
      let score = new Score(this.props.songcheat.signature.time)
      for (let unit of units) score.append(unit.part.score)

      // create player on these notes
      if (this.player) this.player.stop()
      this.player = new Player(this.props.audioCtx, score, {
        loop: this.props.rhythm,
        fretboard: this.props.songcheat.fretboard,
        signature: this.props.songcheat.signature,
        type: this.props.songcheat.wave,
        onDone: () => this.setState({note: null}),
        onNote: (note, isBar, isBeat, isUp, isDown, isArpeggiated) => this.setState({note, isBar, isBeat, isUp, isDown, isArpeggiated}),
        onPlay: () => this.props.onPlay(),
        onPause: playing => this.props.onPause(playing),
        onStop: () => this.props.onStop(),
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

  tempo (speedpct) {
    this.player.speed(parseInt(speedpct, 10))
    this.forceUpdate()
  }

  volume (volume) {
    this.player.setVolume(parseInt(volume, 10))
    this.forceUpdate()
  }

  toggleShuffle () {
    this.player.shuffle = this.player.shuffle ? null : new Duration(this.props.songcheat.signature.shuffle)
    this.forceUpdate()
  }

  getWaveformOptions () {
    let options = []
    for (let type of ['sine', 'square', 'sawtooth', 'triangle']) options.push(<option key={type} value={type}>({type})</option>)
    for (let instrument in waveTables) options.push(<option key={instrument} value={instrument}>{instrument}</option>)
    return options
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(prevProps.units, this.props.units)) {
      if (prevProps.songcheat !== this.props.songcheat) console.log('Player: getting notes because songcheat changed')
      else if (!Utils.arraysEqual(prevProps.units, this.props.units)) console.log('Player: getting notes because units changed')
      this.getNotes()
      this.forceUpdate()
    }
  }

  render () {
    return <div className={'Player ' + (this.props.className || '')}>

      <span className='countdown'>
        {this.state.countdown}
        {this.state.note && <div>
          {this.state.note.rest && <span>REST</span>}
          {!this.state.note.rest && this.state.note.chord && <span>{this.state.note.chord.name}</span>}
          {/* {this.state.isDown && <span className='small'>D</span>}
          {this.state.isUp && <span className='small'>U</span>} */}
        </div>}
      </span>

      {this.player &&
      <div className='controls'>{this.player.minutes()}:{(this.player.seconds() + '').padStart(2, '0')}
        {this.player.stopped || this.player.paused ? <a onClick={() => this.play()}>&#9658;</a> : null}
        {this.player.stopped || this.player.paused ? null : <a onClick={() => this.pause()}>&#10074;&#10074;</a>}
        {this.player.stopped ? null : <a onClick={() => this.stop()}>&#9724;</a>}
        {this.player.stopped ? null : <a onClick={() => this.player.rewind()}>&#9668;</a>}
      </div>}

      {this.player &&
      (this.player.stopped ? null : <div className='options'>

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

        <div>
          <label>Wave form: </label>
          <select
            value={this.player.type}
            onChange={(event) => { this.player.setType(event.target.value); this.forceUpdate() }}>
            {this.getWaveformOptions()}
          </select>
        </div>

        {Duration.valid(this.props.songcheat.signature.shuffle) && <div>
          <RadioButton onChange={() => this.toggleShuffle()} checked={this.player.shuffle !== null} />
          <label>Shuffle On </label>
          <RadioButton onChange={() => this.toggleShuffle()} checked={this.player.shuffle === null} />
          <label>Shuffle Off</label>
        </div>}

      </div>)}

    </div>
  }
}

export default PlayerUI
