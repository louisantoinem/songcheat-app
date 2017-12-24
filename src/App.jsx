import React, {Component} from 'react'

import './App.css'

// components
import Editor from './Editor'
import Chords from './Chords'

// business modules
import {Parser} from 'songcheat-core'
import samples from 'songcheat-samples'

let sampleIndex = 1 // Math.floor(Math.random() * samples.length)
let sampleText = samples[sampleIndex].source

class App extends Component {

  constructor (props) {
    super(props)
    this.parser = new Parser()
    this.state = {
      songcheat: this.parser.parse(sampleText)
    }
  }

  parse (source) {
    try {
      this.setState({ songcheat: this.parser.parse(source) })
    } catch (e) { console.warn(e) }
  }

  render () {
    return (<div className='App'>

      <header className='App-header'>
        <h1 className='App-title'>Welcome to SongCheat ♬</h1>
      </header>

      <div>

        <div className='rightPanel'>
          <Chords chords={this.state.songcheat.chords} />
        </div>

        <Editor width='70%' text={this.state.songcheat.source} onChange={source => this.parse(source)} />,

      </div>

    </div>)
  }
}
export default App
