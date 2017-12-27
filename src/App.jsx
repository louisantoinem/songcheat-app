import React, {Component} from 'react'

import './App.css'

// child components
import Editor from './Editor'
import Chords from './Chords'
import Rhythm from './Rhythm'
import Sheet from './Sheet'

// business modules
import {Utils, Parser, ParserException, Compiler, CompilerException} from 'songcheat-core'
import samples from 'songcheat-demos/dist/samples.json'

class App extends Component {

  constructor (props) {
    super(props)
    this.parser = new Parser()
    this.compiler = new Compiler(0)
    this.state = {
      source: null,
      songcheat: null,
      showChordIndex: null,
      showRhythmIndex: null,
      showPartIndex: null,
      showUnitIndex: null
    }
  }

  componentWillMount () {
    // not done in constructor because we cannot call setState in constructor
    let sampleIndex = Math.floor(Math.random() * samples.length)
    // sampleIndex = 0
    this.songcheat(samples[sampleIndex].source)
  }

  songcheat (source) {
    try {
      // parse and compile songcheat source
      source = Utils.replaceComposedChars(source)
      let songcheat = this.parser.parse(source)
      songcheat = this.compiler.compile(songcheat)
      songcheat.barsPerLine = 2
      this.setState({source: source, songcheat: songcheat, error: null})
    } catch (e) {
      this.setState({source: source, songcheat: null, error: e.toString()})
      if (!(e instanceof ParserException) && !(e instanceof CompilerException)) {
        console.error(e)
      }
    }
  }

  onCursorChange (selection) {
    try {
      let cursor = selection.getCursor()
      let k = this.parser.getPrecedingKeyword(this.state.source, cursor.row + 1)
      if (k) {
        console.info('First keyword before cursor: ' + k.keyword)
        if (this.state.showChordIndex !== k.chordIndex || this.state.showRhythmIndex !== k.rhythmIndex || this.state.showPartIndex !== k.partIndex || this.state.showUnitIndex !== k.unitIndex) {
          this.setState({showChordIndex: k.chordIndex, showRhythmIndex: k.rhythmIndex, showPartIndex: k.partIndex, showUnitIndex: k.unitIndex})
        }
      }
    } catch (e) {
      if (!(e instanceof ParserException) && !(e instanceof CompilerException)) {
        console.error(e)
      }
    }
  }

  render () {
    let panel = null
    if (this.state.error) {
      panel = <div className='error'>{this.state.error}</div>
    } else if (this.state.songcheat) {
      if (this.state.showChordIndex !== null) {
        // always show all chords, not just the selected ones
        panel = <Chords chords={this.state.songcheat.chords/* .slice(this.state.showChordIndex, this.state.showChordIndex + 1) */} />
      } else if (this.state.showRhythmIndex !== null) {
        // always show all rhythms, not just the selected ones
        panel = <Rhythm songcheat={this.state.songcheat} rhythms={this.state.songcheat.rhythms/* .slice(this.state.showRhythmIndex, this.state.showRhythmIndex + 1) */} />
      } else if (this.state.showPartIndex !== null) {
        // create a dummy unit with no lyrics for each selected part
        let units = []
        for (let part of this.state.songcheat.parts.slice(this.state.showPartIndex, this.state.showPartIndex + 1)) {
          units.push({part: part})
        }
        panel = <Sheet songcheat={this.state.songcheat} units={units} />
      } else if (this.state.showUnitIndex !== null) {
        // show selected units
        panel = <Sheet songcheat={this.state.songcheat} units={this.state.songcheat.structure.slice(this.state.showUnitIndex, this.state.showUnitIndex + 1)} />
      } else {
        // show general song metadata
        // TODO
      }
    } else {
      panel = <div className='error'>No songcheat ?!</div>
    }

    return (<div className='App'>

      {/* <header className='App-header'>
        <h1 className='App-title'>Welcome to SongCheat ♬</h1>
      </header> */}

      <div>

        <div className='rightPanel'>
          {panel}
        </div>

        <Editor width='60%' text={this.state.source} onCursorChange={(selection) => this.onCursorChange(selection)} onChange={source => this.songcheat(source)} />,

      </div>

    </div>)
  }
}
export default App
