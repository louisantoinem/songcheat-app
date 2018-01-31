import React, {Component} from 'react'

// business modules
import {Utils, VexTab as SongcheatVexTab } from 'songcheat-core'

// 3rd party components
import ReactResizeDetector from 'react-resize-detector'

// css
import './Score.css'

/* import vextab from 'vextab'
let VexTab = vextab.VexTab
let Artist = vextab.Artist
let Renderer = vextab.Vex.Flow.Renderer */

let VexTab = window.VexTab
let Artist = window.Artist
let Renderer = window.Vex.Flow.Renderer

Artist.NOLOGO = true

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
      if (this.props.songcheat && this.rootDiv) Utils.BM('[Score.jsx] SongCheat ' + (this.props.songcheat.title || '(untitled)'), () => { return this._vextab() })
      setTimeout(() => { if (!this.canceled) this.setState({loading: false}) }, 0)
    }, wait || 0)
  }

  _vextabUnit (artist, unit) {
    let canvas = this.props.rendering === 'canvas' ? document.getElementById('canvas.u.' + unit.id) : document.getElementById('div.u.' + unit.id)
    if (!canvas) return ['No canvas for drawing unit ' + unit.name]

    // SVG needs to be cleaned up
    if (this.props.rendering !== 'canvas') while (canvas.firstChild) canvas.removeChild(canvas.firstChild)

    // convert unit to vextab score
    let score = Utils.BM('[Score.jsx] Unit ' + unit.name + ': SongcheatVexTab.Unit2VexTab', () => { return SongcheatVexTab.Unit2VexTab(this.props.songcheat, unit) })

    // parse and render unit score with vextab
    let vextab = new VexTab(artist)
    Utils.BM('[Score.jsx] Unit ' + unit.name + ': vextab.parse', () => { return vextab.parse(score) })
    Utils.BM('[Score.jsx] Unit ' + unit.name + ': artist.render', () => { return artist.render(new Renderer(canvas, this.props.rendering === 'canvas' ? Renderer.Backends.CANVAS : Renderer.Backends.SVG)) })

    return unit.lyricsWarnings
  }

  _vextab () {
    let errors = []
    let warnings = []

    let W = this.rootDiv.offsetWidth - 20
    this.lastWidth = W
    this.props.songcheat.barsPerLine = Utils.prevPowerOf2(W / 300)

    for (let unit of this.props.units) {
      try {
        warnings = Array.prototype.concat(warnings, Utils.BM('[Score.jsx] Unit ' + unit.name, () => { return this._vextabUnit(new Artist(10, 10, W, {scale: 1.0}), unit) }))
      } catch (e) {
        errors.push(e.message)
      }
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
    if (nextProps.songcheat !== this.props.songcheat && nextProps.filename !== this.props.filename) {
      console.warn('[Score.jsx] Show Loading message because new file loaded')
      this.setState({loading: true})
    }
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(prevProps.units, this.props.units)) {
      if (prevProps.filename !== this.props.filename) console.warn('[Score.jsx] Vextabbing because new file was loaded')
      else if (prevProps.songcheat !== this.props.songcheat) console.warn('[Score.jsx] Vextabbing because songcheat changed')
      else if (!Utils.arraysEqual(prevProps.units, this.props.units)) console.warn('[Score.jsx] Vextabbing because units changed')

      // when loading a new file, wait 500ms before VexTabbing so that chords images can load first
      this.vextab(prevProps.filename !== this.props.filename ? 500 : 0)
    }
  }

  render () {
    return (<div className='Score' ref={div => { this.rootDiv = div }}>
      {this.state.loading && <div style={{ margin: '50px 100px', color: '#EEE', fontSize: '3em'}} >Loading...</div>}
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      {this.props.units.map((unit, index) => <div key={unit.id} id={'div.u.' + unit.id} style={{display: this.state.loading ? 'none' : null}}>
        {this.props.rendering === 'canvas' &&
        <canvas id={'canvas.u.' + unit.id} />}
      </div>)}
      {!this.state.loading && <ReactResizeDetector handleWidth handleHeight onResize={() => {
        if (this.rootDiv && this.lastWidth !== this.rootDiv.offsetWidth - 20) {
          this.onResize()
        }
      }} />}
    </div>)
  }
}

export default Score
