import React, {Component} from 'react'

// business modules
import {Utils, Ascii as AsciiAPI, AsciiException} from 'songcheat-core'

// 3rd party components
import {RadioButton} from 'primereact/components/radiobutton/RadioButton'
import Select from 'react-select'

// css
import './Ascii.css'
import 'react-select/dist/react-select.css'

class Ascii extends Component {

  constructor (props) {
    super(props)
    this.ascii = new AsciiAPI(this.props.songcheat, 0)
    this.state = {
      split: 0,
      maxConsecutiveSpaces: 1,
      errors: []
    }
  }

  getTexts (units) {
    let errors = []
    let texts = []
    let texts_structure = []

    for (let unit of units) {
      try {
        let chordColorizer = line => { return `<span style='color: ${unit.part.color}'>${line}</span>` }
        texts.push(this.ascii.getUnitText(unit, this.state.maxConsecutiveSpaces, this.state.split % 10, this.state.maxConsecutiveSpaces !== 1, chordColorizer))
        texts_structure.push(this.ascii.getPartText(unit.part, this.state.maxConsecutiveSpaces, this.state.split % 10, this.state.maxConsecutiveSpaces !== 1, chordColorizer))
      } catch (e) {
        if (!(e instanceof AsciiException)) {
          console.error(e)
        }
        errors.push(e.message)
      }
    }
    this.setState({errors, texts, texts_structure})
  }

  componentWillMount () {
    this.getTexts(this.props.units)
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.songcheat !== this.props.songcheat) {
      this.ascii = new AsciiAPI(nextProps.songcheat, 0)
    }
    if (nextProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(nextProps.units, this.props.units)) {
      this.getTexts(nextProps.units)
    }
  }

  optionChanged (name, value) {
    this.setState({ [name]: value }, () => { this.getTexts(this.props.units) })
  }

  render () {
    return (<div className='Ascii'>
      {this.state.errors.map((error, index) => <p className='error' key={index}>{error}</p>)}
      <Select
        value={this.state.split}
        onChange={(selectedOption) => { if (selectedOption) this.optionChanged('split', selectedOption.value) }}
        options={[
          { value: 0, label: 'Lyrics as entered' },
          { value: 1, label: 'Lyrics by 1 bar' },
          { value: 2, label: 'Lyrics by 2 bars' },
          { value: 3, label: 'Lyrics by 3 bars' },
          { value: 4, label: 'Lyrics by 4 bars' },
          { value: 11, label: 'Structure by 1 bar' },
          { value: 12, label: 'Structure by 2 bars' },
          { value: 13, label: 'Structure by 3 bars' },
          { value: 14, label: 'Structure by 4 bars' }
        ]}
      />
      <RadioButton onChange={() => this.optionChanged('maxConsecutiveSpaces', 1)} checked={this.state.maxConsecutiveSpaces === 1} />
      <label>Compact </label>
      <RadioButton onChange={() => this.optionChanged('maxConsecutiveSpaces', 0)} checked={this.state.maxConsecutiveSpaces === 0} />
      <label>Respect chord durations</label>

      <div className='Ascii' style={{ columns: (((this.state.split % 10) || 2) * (this.state.maxConsecutiveSpaces === 1 || this.state.split > 10 ? 375 : 700)) + 'px' }}>
        {
        this.props.units.map((unit, index) => <div key={index}>
          {unit.lyricsWarnings.map((warning, index) => <p className='warning' key={index}>{warning}</p>)}
          <p style={{color: unit.part.color}}>[{unit.name}]</p>
          <div dangerouslySetInnerHTML={{__html: this.state.split > 10 ? this.state.texts_structure[index] : this.state.texts[index]}} />
        </div>)
        }
      </div>
    </div>)
  }
}

export default Ascii
