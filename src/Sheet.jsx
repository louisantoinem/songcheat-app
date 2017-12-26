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

class Sheet extends Component {

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
        console.error(e)
        errors.push(e.message)
      }
    }

    this.setState({errors: errors, warnings: warnings})
  }

  componentDidMount () {
    this.vextab()
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(prevProps.units, this.props.units)) {
      this.vextab()
    } else {
      console.info('Not vextabbing since nothing changed')
    }
  }

  render () {
    return (<div>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      {
        this.props.units.map((unit, index) => <div key={unit.id || index}>
          <div className='lyrics'>{
               unit.groups
                ? this.props.compiler.getUnitText(unit, 0, 0, 'rhythm', true)
                : this.props.compiler.getPartText(unit.part, 0, 2, 'rhythm', true)
            }</div>
          <canvas key={unit.id} id={'canvas.' + unit.id} />
        </div>)
      }
    </div>)
  }
}

export default Sheet
