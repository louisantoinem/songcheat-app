// react
import React, { Component } from 'react'

// business modules
import { Utils, Parser, ParserException, Compiler, CompilerException } from 'songcheat-core'
import template from 'songcheat-core/dist/template.json'

// prime react components
import { Menu } from 'primereact/components/menu/Menu'
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
import 'primereact/resources/themes/darkness/theme.css'
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
      editorPosition: 'hidden'
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

  songcheat (source) {
    try {
      // parse and compile songcheat source
      source = Utils.replaceComposedChars(source)
      let songcheat = this.parser.parse(source)
      songcheat = this.compiler.compile(songcheat)
      this.setState({source: source, songcheat: songcheat, error: null})
    } catch (e) {
      this.setState({source: source, songcheat: null, error: e.toString()})
      if (!(e instanceof ParserException) && !(e instanceof CompilerException)) {
        console.error(e)
      }
    }
  }

  onChange (source) {
    clearTimeout(this.typingTimer)
    this.typingTimer = setTimeout(() => this.songcheat(source), this.state.tabIndex === 1 ? 500 : 100)
  }

  render () {
    // set document title
    if (this.state.songcheat && this.state.songcheat.title) document.title = this.state.songcheat.title + ' - ' + this.state.songcheat.artist + ', ' + this.state.songcheat.year

    // editor popup menu items
    var items = []
    for (let item of ['hidden', 'left', 'right', 'top', 'bottom']) {
      items.push({ label: Utils.camelCase(item, true), command: () => { this.setState({ editorPosition: item }) } })
    }

    // layout
    let layout = [0, 1, 2, 3, 4]
    if (this.state.editorPosition === 'left') layout = { right: layout, left: [5] }
    else if (this.state.editorPosition === 'right') layout = { left: layout, right: [5] }
    else if (this.state.editorPosition === 'top') layout = { bottom: layout, top: [5] }
    else if (this.state.editorPosition === 'bottom') layout = { top: layout, bottom: [5] }

    return (<section className='App'>

      <Popup />

      <header className='App-header'>
        <div style={{ float: 'right' }}>
          <Menu model={items} popup ref={el => this.menu = el} />
          <Button label='Editor' onClick={(event) => this.menu.toggle(event)} />
        </div>
        <h1 className='App-title'>SongCheat &nbsp; ♬</h1>
      </header>

      <Dropzone
        style={{ flex: 1, display: 'flex', boxSizing: 'border-box', position: 'relative' }} // needed to serve as a container for splitpane
        acceptClassName='overlay green'
        rejectClassName='overlay red'
        disableClick
        multiple={false}
        accept='text/plain'
        onDrop={this.onDrop.bind(this)} >

        <Patchwork layout={layout}>
          <General label='General' songcheat={this.state.songcheat} />
          <Chords label='Chords' songcheat={this.state.songcheat} />
          <Rhythm label='Rhythm' audioCtx={this.audioCtx} songcheat={this.state.songcheat} />
          <div label='Score'>
            <Player audioCtx={this.audioCtx} rhythm={false} songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} />
            <Score songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} />
          </div>
          <Ascii label='Ascii' songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} />
          <div label='Editor' style={{width: '100%'}}>
            {this.state.error ? <div className='error'>{this.state.error}</div> : null}
            {this.state.error || this.state.songcheat ? null : <div className='error'>No songcheat ?!</div>}
            <Editor width='100%' text={this.state.source} filename={this.state.filename} onChange={source => this.onChange(source)} />,
          </div>
        </Patchwork>

      </Dropzone>

    </section>)
  }
}
export default App
