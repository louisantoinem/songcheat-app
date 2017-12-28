import React, {Component} from 'react'

// business modules
import {Utils, VexTab as SongcheatVexTab} from 'songcheat-core'

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
      errors: [],
      warnings: []
    }
  }

  vextab () {
    let errors = []
    let warnings = []

    for (let rhythm of this.props.rhythms) {
      if (!rhythm.inline) {
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
          artist.render(new Renderer(document.getElementById('canvas.' + rhythm.id), Renderer.Backends.CANVAS))

          console.info('Score done!')
        } catch (e) {
          console.error(e)
          errors.push(e.message)
        }
      }
    }

    this.setState({errors: errors, warnings: warnings})
  }

  componentDidMount () {
    this.vextab()
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(prevProps.rhythms, this.props.rhythms)) {
      this.vextab()
    } else {
      console.info('Not vextabbing since nothing changed')
    }
  }

  render () {
    return (<div>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      {this.props.rhythms.map(rhythm => rhythm.inline ? '' : <canvas key={rhythm.id} id={'canvas.' + rhythm.id} />)}
    </div>)
  }
}

export default Rhythm
