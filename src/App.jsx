// react
import React, { Component } from 'react'

// business modules
import { Utils, Parser, ParserException, Compiler, CompilerException } from 'songcheat-core'
import template from 'songcheat-core/dist/template.json'

// prime react components
import { Button } from 'primereact/components/button/Button'

// 3rd party components
import Popup from 'react-popup'
import Dropzone from 'react-dropzone'

// app components
import Patchwork from './Patchwork'
import General from './General'
import Chords from './Chords'
import Rhythm from './Rhythm'
import Player from './Player'
import Score from './Score'
import Ascii from './Ascii'
import Editor from './Editor'
import Prompt from './Prompt'

// css
import './App.css'
import './Popup.css'
import 'primereact/resources/primereact.min.css'
import 'primereact/resources/themes/omega/theme.css'
import 'font-awesome/css/font-awesome.css'

class App extends Component {

  constructor (props) {
    super(props)
    this.parser = new Parser()
    this.compiler = new Compiler(0)
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext)()
    this.state = {
      source: null,
      songcheat: null,
      filename: null,
      editMode: false
    }
  }

  onDrop (acceptedFiles, rejectedFiles) {
    let self = this
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        self.setState({ filename: file.name })
        self.songcheat(reader.result)
      }
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.readAsText(file)
    })
  }

  componentWillMount () {
    // initialize on SongCheat template provided by songcheat-core
    this.songcheat(template)

    // register prompt plugin
    Popup.registerPlugin('prompt', function (title, defaultValue, placeholder, callback) {
      let promptValue = defaultValue
      let promptChange = function (value) {
        promptValue = value
      }

      this.create({
        title: title,
        content: <Prompt onChange={promptChange} placeholder={placeholder} defaultValue={defaultValue} />,
        buttons: {
          left: ['cancel'],
          right: [{
            text: 'Save',
            key: '⌘+s',
            className: 'success',
            action: function () {
              callback(promptValue)
              Popup.close()
            }
          }]
        }
      })
    })
  }

  componentDidMount () {
    this.setState({ showReset: !this.patchwork.isDefaultLayout() })
  }

  songcheat (source) {
    try {
      // parse and compile songcheat source
      source = Utils.replaceComposedChars(source)
      let songcheat = this.parser.parse(source)
      songcheat = this.compiler.compile(songcheat)
      this.setState({source: source, songcheat: songcheat, error: null})
    } catch (e) {
      this.setState({source: source, error: e.toString()})
      if (!(e instanceof ParserException) && !(e instanceof CompilerException)) {
        console.error(e)
      }
    }
  }

  onChange (source) {
    clearTimeout(this.typingTimer)
    this.typingTimer = setTimeout(() => this.songcheat(source), this.patchwork && this.patchwork.isVisible(3) ? 500 : 100)
  }

  render () {
    // set document title
    if (this.state.songcheat && this.state.songcheat.title) document.title = this.state.songcheat.title + ' - ' + this.state.songcheat.artist + ', ' + this.state.songcheat.year

    return (<section className='App'>

      <Popup />

      <header className='App-header' style={{position: 'relative'}}>
        <div style={{ position: 'absolute', left: '10px' }}>
          <Button label={this.state.editMode ? 'Switch to View mode' : 'Switch to Edit mode'} onClick={(event) => { this.setState({editMode: !this.state.editMode}) }} />
        </div>
        <div style={{ position: 'absolute', right: '10px' }}>
          {this.state.editLayout && this.state.showReset && <Button label='Reset layout' onClick={(event) => this.patchwork.resetLayout()} />}
          <Button label={this.state.editLayout ? 'Done changing layout' : 'Change layout'} onClick={(event) => { this.setState({editLayout: !this.state.editLayout}) }} />
        </div>
        <h1 className='App-title'>SongCheat &nbsp; ♬</h1>
      </header>

      {this.state.error ? <div className='edit_error'>{this.state.error}</div> : null}
      {this.state.error || this.state.songcheat ? null : <div className='edit_error'>No songcheat ?!</div>}

      <Dropzone
        style={{ flex: 1, display: 'flex', boxSizing: 'border-box', position: 'relative' }} // needed to serve as a container for splitpane
        acceptClassName='overlay green'
        rejectClassName='overlay red'
        disableClick
        multiple={false}
        accept='text/plain'
        onDrop={this.onDrop.bind(this)} >

        <Patchwork
          name={this.state.editMode ? 'Edit' : 'View'}
          // defaultLayout={this.state.editMode ? {left: [0, 1, 2, 3, 4], right: [5]} : [0, 1, 2, 3, 4]}
          // test default on big screen
          defaultLayout={this.state.editMode ? {left: [5], right: {'bottom': {right: [1], left: {right: [2], left: [0]}}, 'top': {right: [4], left: [3]}}} : {right: [3, 4], left: {right: [1], left: {'bottom': [2], 'top': [0]}}}}
          editable={this.state.editLayout}
          onChange={() => {
            if (!this.patchwork) console.error('Patchwork triggered onChange before we got our ref: cannot set showReset')
            else this.setState({ showReset: !this.patchwork.isDefaultLayout() })
          }}
          ref={p => { this.patchwork = p }}>
          <General label='General' songcheat={this.state.songcheat} />
          <Chords label='Chords' songcheat={this.state.songcheat} />
          <Rhythm label='Rhythm' audioCtx={this.audioCtx} songcheat={this.state.songcheat} />
          <Ascii label='Ascii' songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} />
          <div label='Score'>
            <Player audioCtx={this.audioCtx} rhythm={false} songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} />
            <Score filename={this.state.filename} songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} />
          </div>
          {this.state.editMode && <div label='Editor' style={{width: '100%'}}>
            <Editor width='100%' text={this.state.source} filename={this.state.filename} onChange={source => this.onChange(source)} />,
          </div>}
        </Patchwork>

      </Dropzone>

    </section>)
  }
}
export default App
