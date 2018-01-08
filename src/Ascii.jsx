import React, {Component} from 'react'

// business modules
import {Utils, Lyrics, LyricsException} from 'songcheat-core'

import './Ascii.css'
import Select from 'react-select'
import 'react-select/dist/react-select.css'

class Ascii extends Component {

  constructor (props) {
    super(props)
    this.lyrics = new Lyrics(this.props.songcheat, 0)
    this.state = {
      split: 0,
      maxConsecutiveSpaces: 1,
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
        texts.push(this.lyrics.getUnitText(unit, this.state.maxConsecutiveSpaces, this.state.split, 'rhythm', this.state.maxConsecutiveSpaces !== 1))
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

  selectChanged (name, selectedOption) {
    if (selectedOption) this.setState({ [name]: selectedOption.value }, () => { this.parseLyrics(this.props.units) })
  }

  render () {
    return (<div className='Ascii'>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      <Select
        value={this.state.maxConsecutiveSpaces}
        onChange={(selectedOption) => { this.selectChanged('maxConsecutiveSpaces', selectedOption) }}
        options={[
          { value: 1, label: 'Compact' },
          { value: 0, label: 'Respect chord durations' }
        ]}
      />
      <Select
        value={this.state.split}
        onChange={(selectedOption) => { this.selectChanged('split', selectedOption) }}
        options={[
          { value: 0, label: 'Split as entered' },
          { value: 1, label: 'One bar par line' },
          { value: 2, label: 'Two bars par line' },
          { value: 4, label: 'Four bars par line' }
        ]}
      />
    <div className='Lyrics' style={{ columns: ((this.state.split || 2) * (this.state.maxConsecutiveSpaces === 1 ? 275 : 550)) + 'px' }}>
        {
        this.props.units.map((unit, index) => <div key={unit.id} style={{color: unit.part.color}}>
          <p>[{unit.name}]</p>
          <div>{this.state.texts[index]}</div>
        </div>)
        }
      </div>
    </div>)
  }
}

export default Ascii
