// react
import React, { Component } from 'react'
import { Map } from 'immutable'

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
import Layout from './Layout'
import General from './General'
import Chords from './Chords'
import Rhythm from './Rhythm'
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

    // load stored layouts if any or get default ones
    let layoutView = localStorage.getItem(this._key(false))
    let layoutEdit = localStorage.getItem(this._key(true))
    let layouts = {
      false: layoutView ? Layout.fromString(layoutView) : this.defaultLayout(false),
      true: layoutEdit ? Layout.fromString(layoutEdit) : this.defaultLayout(true)
    }

    // load stored settings if any
    let settings = localStorage.getItem('SongCheat.App.Settings')
    settings = settings ? JSON.parse(settings) : {}

    this.state = {
      source: null,
      songcheat: null,
      filename: null,
      editMode: false,
      layouts: layouts,
      layout: layouts[false],
      settings: Map(settings)
    }
  }

  _key (editMode) {
    return 'SongCheat.App.Layout.' + (editMode ? 'Edit' : 'View')
  }

  onDrop (acceptedFiles, rejectedFiles) {
    let self = this
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => self.songcheat(reader.result, file.name)
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

  songcheat (source, filename) {
    try {
      // parse and compile songcheat source
      source = Utils.replaceComposedChars(source)
      let songcheat = this.parser.parse(source)
      songcheat = this.compiler.compile(songcheat)
      this.setState({source: source, songcheat: songcheat, filename: filename || this.state.filename, error: null})
    } catch (e) {
      this.setState({source: source, error: e.toString()})
      if (!(e instanceof ParserException) && !(e instanceof CompilerException)) {
        console.error(e)
      }
    }
  }

  onChange (source) {
    clearTimeout(this.typingTimer)
    let scoreVisible = this.state.layout.isVisible(4)
    let ms = scoreVisible ? 500 : 100
    // console.warn('Editor contents changed: waiting ' + ms + ' ms before updating')
    this.typingTimer = setTimeout(() => this.songcheat(source), ms)
  }

  force () {
    // this ensures SplitPanes are unmounted and re-rendered with their defaultSize
    this.setState({ clear: true }, () => this.setState({ clear: false }))
  }

  /* Apply received (loaded) layout as current */
  setLayout (layout) {
    this.setState({layout}, () => this.force())
  }

  /* Update current layout in response to user input */
  updateLayout (layout) {
    this.setState({ layout })
    localStorage.setItem(this._key(this.state.editMode), layout.stringify())
  }

  /* Reset current layout to the default for current mode */
  resetLayout () {
    this.setState({layout: this.defaultLayout(this.state.editMode)}, () => this.force())
    localStorage.removeItem(this._key(this.state.editMode))
  }

  /* Switch mode edit <-> view */
  switchLayout () {
    let prevMode = this.state.editMode
    let nextMode = !this.state.editMode

    // current layout (potentially modified) becomes our new reference for prevMode
    let layouts = { [prevMode]: this.state.layout, [nextMode]: this.state.layouts[nextMode] }
    this.setState({ editMode: nextMode, layouts: layouts, layout: layouts[nextMode] }, () => this.force())
  }

  /* Returns default layout for given mode */
  defaultLayout (editMode) {
    // test default on big screen
    // return new Layout(editMode ? {left: [5], right: {bottom: {right: [1], left: {right: [2], left: [0]}}, top: {right: [4], left: [3]}}} : {right: [3, 4], left: {right: [1], left: {'bottom': [2], 'top': [0]}}})
    return new Layout(editMode ? {right: [0, 1, 2, 3, 4], left: [5]} : { left: [0, 1, 2, 3], right: [4]})
  }

  /* Update settings in response to user input */
  updateSetting (key, value) {
    let settings = this.state.settings.set(key, value)
    this.setState({settings})
    localStorage.setItem('SongCheat.App.Settings', JSON.stringify(settings))
  }

  render () {
    // set document title
    if (this.state.songcheat && this.state.songcheat.title) document.title = this.state.songcheat.title + ' - ' + this.state.songcheat.artist + ', ' + this.state.songcheat.year

    return (<section className='App'>

      <Popup />

      <header className='App-header' style={{position: 'relative'}}>
        <div style={{ position: 'absolute', left: '10px' }}>
          <Button label={this.state.editMode ? 'Switch to View mode' : 'Switch to Edit mode'} onClick={() => this.switchLayout()} />
        </div>
        <div style={{ position: 'absolute', right: '10px' }}>
          {this.state.editLayout && !this.defaultLayout(this.state.editMode).equals(this.state.layout) && <Button label='Reset layout' onClick={() => this.resetLayout()} />}
          <Button label={this.state.editLayout ? 'Done changing layout' : 'Change layout'} onClick={() => this.setState({editLayout: !this.state.editLayout})} />
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
          layout={this.state.layout}
          editLayout={this.state.editLayout}
          onLayoutChanged={layout => this.updateLayout(layout)}
          clear={this.state.clear}>
          <General label='General' songcheat={this.state.songcheat} />
          <Chords label='Chords' songcheat={this.state.songcheat} showInline={this.state.settings.get('Chords.showInline')} onShowInline={showInline => this.updateSetting('Chords.showInline', showInline)} />
          <Rhythm label='Rhythm' audioCtx={this.audioCtx} songcheat={this.state.songcheat} showInline={this.state.settings.get('Rhythm.showInline')} onShowInline={showInline => this.updateSetting('Rhythm.showInline', showInline)} />
          <Ascii label='Ascii' songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} />
          <Score label='Score' audioCtx={this.audioCtx} filename={this.state.filename} songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} />
          {this.state.editMode && <div label='Editor' style={{width: '100%'}}>
            <Editor width='100%' text={this.state.source} filename={this.state.filename} onFilenameChanged={filename => this.setState({filename})} onChange={source => this.onChange(source)} />,
          </div>}
        </Patchwork>

      </Dropzone>

    </section>)
  }
}
export default App
