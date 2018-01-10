import React, {Component} from 'react'

// business modules
import {Utils, Compiler, VexTab as SongcheatVexTab} from 'songcheat-core'

import './Rhythm.css'
import Select from 'react-select'
import 'react-select/dist/react-select.css'
import Player from './Player'

/* import vextab from 'vextab'
let VexTab = vextab.VexTab
let Artist = vextab.Artist
let Renderer = vextab.Vex.Flow.Renderer */

let VexTab = window.VexTab
let Artist = window.Artist
let Renderer = window.Vex.Flow.Renderer

class Rhythm extends Component {

  constructor (props) {
    super(props)
    this.state = {
      showInline: 0,
      hasInline: false,
      errors: [],
      warnings: []
    }
  }

  vextab () {
    let errors = []
    let warnings = []
    let hasInline = false

    for (let rhythm of this.rhythms()) {
      if (rhythm.inline) hasInline = true
      let canvas = document.getElementById('canvas.' + rhythm.id)
      if (canvas) {
        try {
          // parse and render rhythm score with vextab
          console.info('Converting rhythm to vextab score...')
          let score = SongcheatVexTab.Rhythm2VexTab(this.props.songcheat, rhythm)

          // register warning if not a whole number of bars
          if (rhythm.duration % this.props.songcheat.barDuration) {
            let warning = 'Rhythm ' + rhythm.name + ' is currently equivalent to ' + Math.floor(rhythm.duration / this.props.songcheat.barDuration) + ' bar(s) and ' + Utils.durationcodes(rhythm.duration % this.props.songcheat.barDuration) + '. A rhythm unit should be equivalent to a whole number of bars.'
            warnings.push(warning)
          }

          console.info('Parsing score...')
          let artist = new Artist(10, 10, 600, {scale: 1.0})
          let vextab = new VexTab(artist)
          vextab.parse(score)

          console.info('Rendering score...')
          artist.render(new Renderer(canvas, Renderer.Backends.CANVAS))

          console.info('Score done!')
        } catch (e) {
          console.error(e)
          errors.push(e.message)
        }
      }
    }

    this.setState({hasInline: hasInline})

    // update state if any new error or warning during vextabbing
    if (errors.length > 0 || warnings.length > 0) {
      this.setState({
        errors: Array.prototype.concat(this.state.errors, errors),
        warnings: Array.prototype.concat(this.state.warnings, warnings)
      })
    }
  }

  componentDidMount () {
    this.vextab()
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || prevState.showInline !== this.state.showInline || !Utils.arraysEqual(prevProps.rhythms, this.props.rhythms)) {
      this.vextab()
    } else {
      console.info('Not vextabbing since nothing changed')
    }
  }

  selectChanged (name, selectedOption) {
    if (selectedOption) this.setState({ [name]: selectedOption.value })
  }

  rhythms () {
    if (this.props.rhythms) return this.props.rhythms
    return this.props.songcheat ? this.props.songcheat.rhythms : []
  }

  render () {
    let compiler = new Compiler()

    return (<div className='Rhythm'>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}

      {this.props.rhythms || !this.state.hasInline ? '' : <Select
        value={this.state.showInline}
        onChange={(selectedOption) => { this.selectChanged('showInline', selectedOption) }}
        options={[
          { value: 0, label: 'Hide inline rhyhtms' },
          { value: 1, label: 'Show inline rhythms' }
        ]}
      />}
      {this.props.rhythms ? '' : <h3>Rhythms used in this song: </h3>}

      {this.rhythms().map(rhythm => rhythm.inline && !this.state.showInline ? '' : <div key={rhythm.id}>
        <Player audioCtx={this.props.audioCtx} rhythm songcheat={this.props.songcheat} units={[compiler.getRhythmUnit(this.props.songcheat, rhythm)]} />
        <canvas id={'canvas.' + rhythm.id} />
      </div>)}
    </div>)
  }
}

export default Rhythm
