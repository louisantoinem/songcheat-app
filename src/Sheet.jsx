import React, {Component} from 'react'

// business modules
import {Utils, VexTab as SongcheatVexTab, Lyrics, LyricsException} from 'songcheat-core'

/* import vextab from 'vextab'
let VexTab = vextab.VexTab
let Artist = vextab.Artist
let Renderer = vextab.Vex.Flow.Renderer */

let VexTab = window.VexTab
let Artist = window.Artist
let Renderer = window.Vex.Flow.Renderer

class Sheet extends Component {

  constructor(props) {
    super(props)
    this.lyrics = new Lyrics(this.props.songcheat, 0)
    this.state = {
      errors: [],
      warnings: []
    }
  }

  vextab() {
    let errors = []
    let warnings = []

    for (let unit of this.props.units) {
      try {
        // parse and render unit score with vextab
        console.info('Converting unit to vextab score...')
        let score = SongcheatVexTab.Unit2VexTab(this.props.songcheat, unit)

        console.info('Parsing score...')
        let artist = new Artist(10, 10, 600, {scale: 1.0})
        let vextab = new VexTab(artist)
        vextab.parse(score)

        console.info('Rendering score...')
        artist.render(new Renderer(document.getElementById('canvas.' + unit.id), Renderer.Backends.CANVAS))

        console.info('Score done!')
      } catch (e) {
        if (!(e instanceof LyricsException)) {
          console.error(e)
        }
        errors.push(e.message)
      }
    }

    // update state if any new error or warning during vextabbing
    if (errors.length > 0 || warnings.length > 0) {
      this.setState({
        errors: Array.prototype.concat(this.state.errors, errors),
        warnings: Array.prototype.concat(this.state.warnings, warnings)
      })
    }
  }

  parseLyrics(units) {
    let errors = []
    let warnings = []
    let texts = []

    for (let unit of units) {
      // parse lyrics and show warnings if any
      if (unit.id) {
        warnings = Array.prototype.concat(warnings, this.lyrics.parseLyrics(unit))
      }

      // get lyrics text
      texts.push(
        unit.id
        ? this.lyrics.getUnitText(unit, 0, 0, 'rhythm', true)
        : this.lyrics.getPartText(unit.part, 0, 2, 'rhythm', true))
    }

    this.setState({errors: errors, warnings: warnings, texts: texts})
  }

  componentWillMount() {
    this.parseLyrics(this.props.units)
  }

  componentDidMount() {
    this.vextab()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.songcheat !== this.props.songcheat) {
      this.lyrics = new Lyrics(nextProps.songcheat, 0)
    }
    if (nextProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(nextProps.units, this.props.units)) {
      this.parseLyrics(nextProps.units)
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(prevProps.units, this.props.units)) {
      this.vextab()
    } else {
      console.log('Not vextabbing since nothing changed')
    }
  }

  render() {
    return (<div>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      {
        this.props.units.map((unit, index) => <div key={unit.id || index}>
          <div className='lyrics'>{this.state.texts[index]}</div>
          <canvas key={unit.id} id={'canvas.' + unit.id}/>
        </div>)
      }
    </div>)
  }
}

export default Sheet
