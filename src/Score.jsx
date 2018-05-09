import React, {Component} from 'react'

// business modules
import {Utils, VexTab as SongcheatVexTab } from 'songcheat-core'

// prime react components
import {Checkbox} from 'primereact/components/checkbox/Checkbox'

// 3rd party components
import ReactResizeDetector from 'react-resize-detector'
import Select from 'react-select'

// css
import './Score.css'
import 'react-select/dist/react-select.css'

/* import vextab from 'vextab'
let VexTab = vextab.VexTab
let Artist = vextab.Artist
let Renderer = vextab.Vex.Flow.Renderer */

let VexTab = window.VexTab
let Artist = window.Artist
let Renderer = window.Vex.Flow.Renderer

Artist.NOLOGO = true

let MAX_STAVES_PER_SCORE = 8

class Score extends Component {

  constructor (props) {
    super(props)
    this.state = {
      loading: true,
      errors: [],
      warnings: []
    }
  }

  vextab (wait) {
    // start a vextab in next event loop so that component can be displayed already (with loading message)
    // when done, change state.loading to false in next event loop
    if (wait) console.warn('[Score.jsx] VexTabbing delayed by ' + wait + ' ms')
    setTimeout(() => {
      if (this.props.songcheat && this.rootDiv) Utils.BM(`[Score.jsx] SongCheat "${this.props.songcheat.title || '(untitled)'}"`, () => { return this._vextab() })
      setTimeout(() => { if (!this.canceled) this.setState({loading: false}) }, 0)
    }, wait || 0)
  }

  _vextabUnits (units, W) {
    // clean up
    let divUnits = document.getElementById('div.units')
    if (!divUnits) throw new Error('Could not find div for drawing scores')
    while (divUnits.firstChild) divUnits.removeChild(divUnits.firstChild)

    // convert unit to vextab scores
    let barsPerLine = Math.max(1, Math.floor(W / 500)) // Utils.prevPowerOf2(W / 300)
    let scores = Utils.BM('[Score.jsx] SongcheatVexTab.Units2VexTab', () => { return SongcheatVexTab.Units2VexTab(this.props.songcheat, units, this.props.staveMode, barsPerLine, this.props.separateUnits, this.props.showLyrics, this.props.showStrokes, MAX_STAVES_PER_SCORE) })
    scores.forEach((score, scoreIndex) => {
      // create canvas or div (for svg)
      let canvas = document.createElement(this.props.rendering === 'canvas' ? 'canvas' : 'div')
      if (!canvas) throw new Error('Could not create canvas for drawing score')
      divUnits.appendChild(canvas)

      // parse and render score with vextab
      let artist = new Artist(10, 10, W, {scale: 1.0})
      let vextab = new VexTab(artist)
      Utils.BM(`[Score.jsx] ${units.length} units - Score ${scoreIndex + 1}/${scores.length}: vextab.parse`, () => { vextab.parse(score) })
      Utils.BM(`[Score.jsx] ${units.length} units - Score ${scoreIndex + 1}/${scores.length}: artist.render`, () => { artist.render(new Renderer(canvas, this.props.rendering === 'canvas' ? Renderer.Backends.CANVAS : Renderer.Backends.SVG)) })
    })
  }

  _vextab () {
    let errors = []
    let warnings = []

    let W = this.rootDiv.offsetWidth - 20
    this.lastWidth = W
    try {
      for (let unit of this.props.units) warnings = Array.prototype.concat(warnings, unit.lyricsWarnings)
      Utils.BM(`[Score.jsx] Rendering ${this.props.units.length} units`, () => { this._vextabUnits(this.props.units, W) })
    } catch (e) {
      errors.push(e.message)
    }

    if (!this.canceled) {
      this.setState({
        errors: errors,
        warnings: warnings
      })
    }
  }

  onResize () {
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
    let ms = this.props.rendering === 'canvas' ? 375 : 750
    console.warn('[Score.jsx] Postponing resize for ' + ms + ' ms')
    this.resizeTimer = setTimeout(() => {
      console.warn('[Score.jsx] Vextabbing because resized')
      this.vextab()
    }, ms)
  }

  componentDidMount () {
    // console.warn('[Score.jsx] Vextabbing after mount')
    this.vextab()
  }

  componentWillUnmount () {
    // for some strange reason, the first time we switch to edit mode, a Score component is mounted then immediately unmounted
    // vextab which is called in a setTimeout then produces a warning when calling setState on the unmounted component
    // this is way we mark that we must cancel this setState
    // console.warn('[Score.jsx] Unmounting')
    this.canceled = true
  }

  componentWillReceiveProps (nextProps) {
    // show loading message again when new file dropped
    if (nextProps.filename !== this.props.filename) {
      console.warn('[Score.jsx] Show Loading message because new file loaded')
      this.setState({loading: true})
    }
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat ||
      prevProps.staveMode !== this.props.staveMode ||
      prevProps.showLyrics !== this.props.showLyrics ||
      prevProps.showStrokes !== this.props.showStrokes ||
      prevProps.separateUnits !== this.props.separateUnits ||
      !Utils.arraysEqual(prevProps.units, this.props.units)) {
      if (prevProps.filename !== this.props.filename) console.warn('[Score.jsx] Vextabbing because new file was loaded')
      else if (prevProps.songcheat !== this.props.songcheat) console.warn('[Score.jsx] Vextabbing because songcheat changed')
      else if (!Utils.arraysEqual(prevProps.units, this.props.units)) console.warn('[Score.jsx] Vextabbing because units changed')

      // when loading a new file, wait 500ms before VexTabbing so that chords images can load first
      this.vextab(prevProps.filename !== this.props.filename ? 500 : 0)
    }
  }

  render () {
    return (<div className='Score' ref={div => { this.rootDiv = div }}>

      <Select
        value={this.props.staveMode}
        onChange={(selectedOption) => { if (selectedOption) this.props.optionChanged('staveMode', selectedOption.value) }}
        options={[
        { value: '', label: 'Default stave mode (as set by author)' },
        { value: 'n', label: 'Notation' },
        { value: 'nt', label: 'Notation and tablature' },
        { value: 'nts', label: 'Notation and tablature with stems (up)' },
        { value: 'ntsd', label: 'Notation and tablature with stems (down)' },
        { value: 't', label: 'Tablature' },
        { value: 'ts', label: 'Tablature with stems (up)' },
        { value: 'tsd', label: 'Tablature with stems (down)' },
        { value: 'r', label: 'Rhythm' },
        { value: 'rt', label: 'Rhythm and tablature' }
        ]}
      />
      <Checkbox onChange={(e) => this.props.optionChanged('showStrokes', e.checked)} checked={this.props.showStrokes} />
      <label>Show strokes</label>
      <Checkbox onChange={(e) => this.props.optionChanged('showLyrics', e.checked)} checked={this.props.showLyrics} />
      <label>Show lyrics</label>
      <Checkbox onChange={(e) => this.props.optionChanged('separateUnits', e.checked)} checked={this.props.separateUnits} />
      <label>Separate units</label>

      {this.state.loading && <div style={{ margin: '50px 100px', color: '#EEE', fontSize: '3em'}} >Loading...</div>}
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      <div id='div.units' style={{display: this.state.loading ? 'none' : null}} />
      {!this.state.loading && <ReactResizeDetector handleWidth handleHeight onResize={() => {
        if (this.rootDiv && this.lastWidth !== this.rootDiv.offsetWidth - 20) {
          this.onResize()
        }
      }} />}
    </div>)
  }
}

export default Score
