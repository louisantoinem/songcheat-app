import React, { Component } from 'react'

import './App.css'

// child components
import Editor from './Editor'
import Chords from './Chords'
import Rhythm from './Rhythm'
import Sheet from './Sheet'
import Dropzone from 'react-dropzone'

// business modules
import { Utils, Parser, ParserException, Compiler, CompilerException } from 'songcheat-core'
import template from 'songcheat-core/dist/template.json'

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

  onDrop (acceptedFiles, rejectedFiles) {
    let self = this
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => { self.songcheat(reader.result) }
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.readAsText(file)
    })
  }

  componentWillMount () {
    // initialize on SongCheat template provided by songcheat-core
    this.songcheat(template)
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

  getPanel () {
    if (this.state.error) {
      return <div className='error'>{this.state.error}</div>
    }
    if (!this.state.songcheat) {
      return <div className='error'>No songcheat ?!</div>
    }

    document.title = this.state.songcheat.title + ' - ' + this.state.songcheat.artist + ', ' + this.state.songcheat.year

    if (this.state.showChordIndex !== null) {
      // always show all chords, not just the selected ones
      return <Chords chords={this.state.songcheat.chords/* .slice(this.state.showChordIndex, this.state.showChordIndex + 1) */} />
    }
    if (this.state.showRhythmIndex !== null) {
      // always show all rhythms, not just the selected ones
      return <Rhythm songcheat={this.state.songcheat} rhythms={this.state.songcheat.rhythms/* .slice(this.state.showRhythmIndex, this.state.showRhythmIndex + 1) */} />
    }
    if (this.state.showPartIndex !== null) {
      // create a dummy unit with no lyrics for each selected part
      let units = []
      for (let part of this.state.songcheat.parts.slice(this.state.showPartIndex, this.state.showPartIndex + 1)) units.push({part: part})
      return <Sheet songcheat={this.state.songcheat} units={units} />
    }
    if (this.state.showUnitIndex !== null) {
      // show selected units
      return <Sheet songcheat={this.state.songcheat} units={this.state.songcheat.structure.slice(this.state.showUnitIndex, this.state.showUnitIndex + 1)} />
    }

    // show general song metadata
    return <div>

      <h1>{this.state.songcheat.title}</h1>
      <h2>{this.state.songcheat.artist}, {this.state.songcheat.year}</h2>
      <h3>{this.state.songcheat.signature.tempo} bpm</h3>
      <p style={{whiteSpace: 'pre-wrap', width: '100%'}}>{this.state.songcheat.comment}</p>
      <h3>Capo: {this.state.songcheat.capo > 0 ? this.state.songcheat.capo : 'n/a'}</h3>
      <h3>Tuning: {this.state.songcheat.tuning}</h3>
      {/* TODO: Show: difficulty, video, tutorial, key, time, shuffle (svg) */}

    </div>
  }

  render () {
    return (<div className='App'>

      {/* <header className='App-header'>
        <h1 className='App-title'>Welcome to SongCheat ♬</h1>
      </header> */}

      <div>

        <div className='rightPanel'>
          {this.getPanel()}
        </div>

        <Editor width='60%' text={this.state.source} onCursorChange={(selection) => this.onCursorChange(selection)} onChange={source => this.songcheat(source)} />,

        {/* drop zone cannot be over the editor since it would prevent clicking in the editor (drop zone needs pointer events to detect drag) */}
        {/* it also prevents scrolling the right panel, so give it only 10% width */}
        <Dropzone
          style={{ position: 'fixed', right: '0px', bottom: '0px', width: '10%', height: '100%', opacity: '0.2', zIndex: 1 /* >= right panel */ }}
          acceptStyle={{ backgroundColor: 'green', width: '100%' }}
          rejectStyle={{ backgroundColor: 'red', width: '100%' }}
          disableClick
          multiple={false}
          accept='text/plain'
          onDrop={this.onDrop.bind(this)} />

      </div>

    </div>)
  }
}
export default App
