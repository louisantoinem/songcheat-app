import React, {Component} from 'react'

// business modules
import {Utils, VexTab as SongcheatVexTab, Lyrics, LyricsException} from 'songcheat-core'

// 3rd party components
import ReactResizeDetector from 'react-resize-detector'

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

  vextab (showLoadingMessage) {
    // first change state.loading to true
    // when done (async), start a vextab in next event loop
    // when done (sync), change state.loading to false in next event loop
    this.setState({loading: typeof showLoadingMessage === 'undefined' ? true : showLoadingMessage}, () => setTimeout(() => {
      this._vextab()
      setTimeout(() => this.setState({loading: false}), 0)
    }, 0))
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

    this.setState({
      errors: errors,
      warnings: warnings
    })
  }

  onResize () {
    clearTimeout(this.resizeTimer)
    this.resizeTimer = setTimeout(() => this.vextab(false), 50)
  }

  componentDidMount () {
    this.vextab()
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.songcheat !== this.props.songcheat) {
      this.lyrics = new Lyrics(nextProps.songcheat, 0)
    }
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(prevProps.units, this.props.units)) {
      if (prevProps.songcheat !== this.props.songcheat) console.warn('Vextabbing because songcheat changed')
      if (!Utils.arraysEqual(prevProps.units, this.props.units)) console.warn('Vextabbing because units changed')
      this.vextab()
    } else {
      console.log('Not vextabbing since nothing changed')
    }
  }

  render () {
    return (<div ref={div => { this.rootDiv = div }}>
      {this.state.loading && <div style={{ margin: '50px 100px', color: '#EEE', fontSize: '3em'}} >Loading...</div>}
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      {this.props.units.map((unit, index) => <div key={unit.id || index}>
        <canvas style={{display: this.state.loading ? 'none' : null}} key={unit.id} id={'canvas.u.' + unit.id} />
      </div>)}
      {!this.state.loading && <ReactResizeDetector handleWidth handleHeight onResize={() => {
        if (this.rootDiv && this.lastWidth !== this.rootDiv.offsetWidth - 20) {
          console.warn('Vextabbing because resized')
          this.onResize()
        }
      }} />}
    </div>)
  }
}

export default Score
