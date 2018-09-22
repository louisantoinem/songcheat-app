import React, {Component} from 'react'

// business modules
import {Utils, ChordPix} from 'songcheat-core'

// prime react components
import {Checkbox} from 'primereact/components/checkbox/Checkbox'

// css
import './Chords.css'

class Chords extends Component {

  constructor (props) {
    super(props)

    this.state = {
      hasInline: false
    }
  }

  chordImage (chord) {
    try {
      return <img alt={chord.tablature} title={this.props.songcheat ? this.props.songcheat.fretboard.chordPitches(chord) : chord.comment} src={ChordPix.url(chord, 175)} />
    } catch (e) {
      return <p className='error' style={{ margin: '12px' }}>{e.message}</p>
    }
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

      { !this.props.chords &&
      this.state.hasInline && <div className='Options'>
        <Checkbox onChange={(e) => this.props.onShowInline(e.checked)} checked={this.props.showInline} />
        <label>Show inline chords</label>
      </div>}

      {this.props.chords ? '' : <h3>Chords used in this song: </h3>}

      {
        this.chords().map(
          chord => chord.inline && !this.props.showInline
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
