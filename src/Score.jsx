import React, {Component} from 'react'

// business modules
import {Utils, VexTab as SongcheatVexTab, Lyrics, LyricsException} from 'songcheat-core'

// 3rd party components
import ReactResizeDetector from 'react-resize-detector'

// app components
import Player from './Player'

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
    this.lyrics = new Lyrics(props.songcheat, 0)
    this.state = {
      loading: true,
      errors: [],
      warnings: []
    }
  }

  vextab () {
    // start a vextab in next event loop so that component can be displayed already (with loading message)
    // when done, change state.loading to false in next event loop
    setTimeout(() => {
      this._vextab()
      setTimeout(() => { if (!this.canceled) this.setState({loading: false}) }, 0)
    }, 0)
  }

  _vextab () {
    let errors = []
    let warnings = []

    if (this.props.songcheat && this.rootDiv) {
      let t0 = Date.now()
      let W = this.rootDiv.offsetWidth - 20
      this.lastWidth = W
      this.props.songcheat.barsPerLine = Utils.prevPowerOf2(W / 300)

      for (let unit of this.props.units) {
        let canvas = document.getElementById('canvas.u.' + unit.id)
        if (canvas) {
          try {
            // parse lyrics and show warnings if any
            warnings = Array.prototype.concat(warnings, this.lyrics.parseLyrics(unit))

            // parse and render unit score with vextab
            let start = Date.now()
            console.info('Converting unit to vextab score...')
            let score = SongcheatVexTab.Unit2VexTab(this.props.songcheat, unit)
            console.log('Took ' + ((Date.now() - start) / 1000.0) + ' s')

            start = Date.now()
            console.info('Parsing score...')
            let artist = new Artist(10, 10, W, {scale: 1.0})
            let vextab = new VexTab(artist)
            vextab.parse(score)
            console.log('Took ' + ((Date.now() - start) / 1000.0) + ' s')

            start = Date.now()
            console.info('Rendering score...')
            artist.render(new Renderer(canvas, Renderer.Backends.CANVAS))
            console.log('Took ' + ((Date.now() - start) / 1000.0) + ' s')

            console.info('Score done!')
          } catch (e) {
            if (!(e instanceof LyricsException)) {
              console.error(e)
            }
            errors.push(e.message)
          }
        }
      }

      console.log(this.props.units.length + ' units took ' + ((Date.now() - t0) / 1000.0) + ' s')
    }

    if (!this.canceled) {
      this.setState({
        errors: errors,
        warnings: warnings
      })
    }
  }

  onResize () {
    clearTimeout(this.resizeTimer)
    this.resizeTimer = setTimeout(() => {
      console.warn('Score: Vextabbing because resized')
      this.vextab()
    }, 150)
  }

  componentDidMount () {
    // console.warn('Score: did mount')
    this.vextab()
  }

  componentWillUnmount () {
    // for some strange reason, the first time we switch to edit mode, a Score component is mounted then immediately unmounted
    // vextab which is called in a setTimeout then produces a warning when calling setState on the unmounted component
    // this is way we mark that we must cancel this setState
    // console.warn('Score: will unmount')
    this.canceled = true
  }

  componentWillReceiveProps (nextProps) {
    // show loading message again when new file dropped
    if (nextProps.songcheat !== this.props.songcheat && nextProps.filename !== this.props.filename) {
      console.warn('Score: new file loaded')
      this.setState({loading: true})
    }

    // recreate Lyrics API when songcheat changed
    if (nextProps.songcheat !== this.props.songcheat) this.lyrics = new Lyrics(nextProps.songcheat, 0)
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(prevProps.units, this.props.units)) {
      if (prevProps.songcheat !== this.props.songcheat) console.warn('Score: Vextabbing because songcheat changed')
      else if (!Utils.arraysEqual(prevProps.units, this.props.units)) console.warn('Score: Vextabbing because units changed')
      this.vextab()
    } else {
      console.log('Score: Not vextabbing since nothing changed')
    }
  }

  render () {
    return (<div className='Score' ref={div => { this.rootDiv = div }}>
      <Player audioCtx={this.props.audioCtx} rhythm={false} songcheat={this.props.songcheat} units={this.props.songcheat ? this.props.songcheat.structure : []} />
      {this.state.loading && <div style={{ margin: '50px 100px', color: '#EEE', fontSize: '3em'}} >Loading...</div>}
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      {this.props.units.map((unit, index) => <div key={unit.id || index}>
        <canvas style={{display: this.state.loading ? 'none' : null}} key={unit.id} id={'canvas.u.' + unit.id} />
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
