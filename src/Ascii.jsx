import React, {Component} from 'react'

// business modules
import {Utils, Lyrics, LyricsException} from 'songcheat-core'

import './Ascii.css'

class Ascii extends Component {

  constructor (props) {
    super(props)
    this.lyrics = new Lyrics(this.props.songcheat, 0)
    this.state = {
      errors: [],
      warnings: []
    }
  }

  parseLyrics (units) {
    let errors = []
    let warnings = []
    let texts = []

    for (let unit of units) {
      try {
        // parse lyrics and show warnings if any
        if (unit.id) {
          warnings = Array.prototype.concat(warnings, this.lyrics.parseLyrics(unit))
        }

        // get lyrics text
        texts.push(this.lyrics.getUnitText(unit, this.props.maxConsecutiveSpaces, this.props.split, 'rhythm', this.props.showDots))
      } catch (e) {
        if (!(e instanceof LyricsException)) {
          console.error(e)
        }
        errors.push(e.message)
      }
    }
    this.setState({errors: errors, warnings: warnings, texts: texts})
  }

  componentWillMount () {
    this.parseLyrics(this.props.units)
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.songcheat !== this.props.songcheat) {
      this.lyrics = new Lyrics(nextProps.songcheat, 0)
    }
    if (nextProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(nextProps.units, this.props.units)) {
      this.parseLyrics(nextProps.units)
    }
  }

  render () {
    return (<div className='Ascii'>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      {
        this.props.units.map((unit, index) => <div key={unit.id} style={{color: unit.part.color}}>
          <p>[{unit.name}]</p>
          <div>{this.state.texts[index]}</div>
        </div>)
      }
    </div>)
  }
}

export default Ascii
