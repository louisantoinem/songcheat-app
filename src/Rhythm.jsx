import React, {Component} from 'react'

// business modules
import {Utils, Compiler, VexTab as SongcheatVexTab} from 'songcheat-core'

// prime react components
import {Checkbox} from 'primereact/components/checkbox/Checkbox'

// 3rd party components
import ReactResizeDetector from 'react-resize-detector'

// app components
import Player from './Player'

// css
import './Rhythm.css'

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
      showInline: false,
      hasInline: false,
      errors: [],
      warnings: []
    }
  }

  vextab () {
    let errors = []
    let warnings = []
    let hasInline = false

    let W = this.rootDiv.offsetWidth - 20
    this.lastWidth = W

    for (let rhythm of this.rhythms()) {
      if (rhythm.inline) hasInline = true
      let canvas = document.getElementById('canvas.r.' + rhythm.id)
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
          let artist = new Artist(10, 10, W, {scale: 1.0})
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

    this.setState({
      hasInline: hasInline,
      errors: errors,
      warnings: warnings
    })
  }

  componentDidMount () {
    console.warn('Vextabbing because did mount')
    this.vextab()
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || prevState.showInline !== this.state.showInline || !Utils.arraysEqual(prevProps.rhythms, this.props.rhythms)) {
      if (prevProps.songcheat !== this.props.songcheat) console.warn('Vextabbing because songcheat changed')
      if (prevState.showInline !== this.state.showInline) console.warn('Vextabbing because showInline changed')
      if (!Utils.arraysEqual(prevProps.rhythms, this.props.rhythms)) console.warn('Vextabbing because rhythms changed')
      this.vextab()
    } else {
      console.info('Not vextabbing since nothing changed')
    }
  }

  rhythms () {
    if (this.props.rhythms) return this.props.rhythms
    return this.props.songcheat ? this.props.songcheat.rhythms : []
  }

  render () {
    let compiler = new Compiler()

    return (<div ref={div => { this.rootDiv = div }} className='Rhythm'>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}

      {!this.props.rhythms && this.state.hasInline &&
        <div className='Options'>
          <Checkbox onChange={(e) => this.setState({showInline: e.checked})} checked={this.state.showInline} />
          <label>Show inline rhythms</label>
        </div>}

      {!this.props.rhythms && this.props.songcheat && <h3>Tempo: {this.props.songcheat.signature.tempo} bpm</h3>}
      {!this.props.rhythms && <h3>Rhythms used in this song:</h3>}

      {this.rhythms().map(rhythm => (this.state.showInline || !rhythm.inline) && <div key={rhythm.id}>
        <Player audioCtx={this.props.audioCtx} rhythm songcheat={this.props.songcheat} units={[compiler.getRhythmUnit(this.props.songcheat, rhythm)]} />
        <canvas id={'canvas.r.' + rhythm.id} />
        </div>)}

      <ReactResizeDetector handleWidth handleHeight onResize={() => {
        if (this.rootDiv && this.lastWidth !== this.rootDiv.offsetWidth - 20) {
          console.warn('Vextabbing because resized')
          this.vextab()
        }
      }} />
    </div>)
  }
}

export default Rhythm
