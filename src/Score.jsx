import React, {Component} from 'react'
import ReactResizeDetector from 'react-resize-detector'

// business modules
import {Utils, VexTab as SongcheatVexTab, Lyrics, LyricsException} from 'songcheat-core'

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
      errors: [],
      warnings: []
    }
  }

  vextab () {
    let errors = []
    let warnings = []

    if (this.props.songcheat) {
      let t0 = Date.now()
      let W = this.rootDiv.offsetWidth - 20
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
      this.vextab()
    } else {
      console.log('Not vextabbing since nothing changed')
    }
  }

  render () {
    return (<div ref={div => { this.rootDiv = div }}>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      {
        this.props.units.map((unit, index) => <div key={unit.id || index}>
          <canvas key={unit.id} id={'canvas.u.' + unit.id} />
        </div>)
      }
      <ReactResizeDetector handleWidth handleHeight onResize={() => { if (this.rootDiv) this.vextab() }} />
    </div>)
  }
}

export default Score
