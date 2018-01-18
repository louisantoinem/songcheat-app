import React, {Component} from 'react'

// business modules
import {Utils, Lyrics, LyricsException} from 'songcheat-core'

// 3rd party components
import {Checkbox} from 'primereact/components/checkbox/Checkbox'
import Select from 'react-select'

// css
import './Ascii.css'
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
    let texts_structure = []

    for (let unit of units) {
      try {
        // parse lyrics and show warnings if any
        if (unit.id) {
          warnings = Array.prototype.concat(warnings, this.lyrics.parseLyrics(unit))
        }

        // get lyrics text
        texts.push(this.lyrics.getUnitText(unit, this.state.maxConsecutiveSpaces, this.state.split, 'rhythm', this.state.maxConsecutiveSpaces !== 1))
        texts_structure.push(this.lyrics.getPartText(unit.part, this.state.maxConsecutiveSpaces, this.state.split, 'rhythm', this.state.maxConsecutiveSpaces !== 1))
      } catch (e) {
        if (!(e instanceof LyricsException)) {
          console.error(e)
        }
        errors.push(e.message)
      }
    }
    this.setState({errors, warnings, texts, texts_structure})
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

  optionChanged (name, value) {
    this.setState({ [name]: value }, () => { this.parseLyrics(this.props.units) })
  }

  render () {
    return (<div className='Ascii'>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      {this.state.warnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
      <Select
        value={this.state.maxConsecutiveSpaces}
        onChange={(selectedOption) => { if (selectedOption) this.optionChanged('maxConsecutiveSpaces', selectedOption.value) }}
        options={[
          { value: 1, label: 'Compact' },
          { value: 0, label: 'Respect chord durations' }
        ]}
      />
      <Select
        value={this.state.split}
        onChange={(selectedOption) => { if (selectedOption) this.optionChanged('split', selectedOption.value) }}
        options={[
          { value: 0, label: this.state.structure ? 'One line per part' : 'Split as entered' },
          { value: 1, label: 'One bar par line' },
          { value: 2, label: 'Two bars par line' },
          { value: 4, label: 'Four bars par line' }
        ]}
      />

      <Checkbox onChange={(e) => this.optionChanged('structure', e.checked)} checked={this.state.structure} />
      <label>Stucture only</label>

      <div className='Lyrics' style={{ columns: ((this.state.split || 2) * (this.state.maxConsecutiveSpaces === 1 ? 275 : 550)) + 'px' }}>
        {
        this.props.units.map((unit, index) => <div key={unit.id} style={{color: unit.part.color}}>
          <p>[{unit.name}]</p>
          <div>{this.state.structure ? this.state.texts_structure[index] : this.state.texts[index]}</div>
        </div>)
        }
      </div>
    </div>)
  }
}

export default Ascii
