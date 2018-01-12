import React, {Component} from 'react'
import {Utils, ChordPix} from 'songcheat-core'

import './Chords.css'
import Select from 'react-select'
import 'react-select/dist/react-select.css'

class Chords extends Component {

  constructor (props) {
    super(props)
    this.state = {
      showInline: 0,
      hasInline: false
    }
  }

  chordImage (chord) {
    try {
      return <img alt={chord.tablature} title={chord.comment} src={ChordPix.url(chord, 175)} />
    } catch (e) {
      return <p className='error' style={{ margin: '12px' }}>{e.message}</p>
    }
  }

  selectChanged (name, selectedOption) {
    if (selectedOption) this.setState({ [name]: selectedOption.value })
  }

  chords () {
    if (this.props.chords) return this.props.chords
    return this.props.songcheat ? this.props.songcheat.chords : []
  }

  updateHasInline () {
    let hasInline = false
    for (let chord of this.chords()) if (chord.inline) hasInline = true
    this.setState({hasInline: hasInline})
  }

  componentDidMount () {
    this.updateHasInline()
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.songcheat !== this.props.songcheat || !Utils.arraysEqual(prevProps.chords, this.props.chords)) {
      this.updateHasInline()
    }
  }

  render () {
    return (<div className='Chords'>

      {this.props.chords || !this.state.hasInline ? '' : <Select
        value={this.state.showInline}
        onChange={(selectedOption) => { this.selectChanged('showInline', selectedOption) }}
        options={[
        { value: 0, label: 'Hide inline chords' },
        { value: 1, label: 'Show inline chords' }
        ]}
      />}
      {this.props.chords ? '' : <h3>Chords used in this song: </h3>}

      {
        this.chords().map(
          chord => chord.inline && !this.state.showInline
          ? ''
          : <div key={chord.id}>
            {this.chordImage(chord)}
            <p>{chord.comment}</p>
          </div>)
      }
    </div>)
  }
}

export default Chords
