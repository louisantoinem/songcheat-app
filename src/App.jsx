// react
import React, { Component } from 'react'
import { Map } from 'immutable'

// business modules
import { Utils, Parser, ChordException, TokenizerException, ParserException, Compiler, CompilerException } from 'songcheat-core'
import template from 'songcheat-core/dist/template.json'

// prime react components
import { Button } from 'primereact/components/button/Button'
import { Growl } from 'primereact/components/growl/Growl'

// 3rd party components
import Popup from 'react-popup'
import Dropzone from 'react-dropzone'
import saveAs from 'save-as'
import { BSON } from 'mongodb-stitch'

// app components
import Patchwork from './Patchwork'
import Layout from './Layout'
import Player from './Player'
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
import 'primeicons/primeicons.css'
import 'font-awesome/css/font-awesome.css'

class App extends Component {

  constructor (props) {
    super(props)
    this.parser = new Parser()
    this.compiler = new Compiler(0)
    this.audioCtx = this.props.audioCtx
    this.stitchClient = this.props.stitchClient
    this.songcheats = this.props.songcheats

    // get _id from url, if it's a valid one
    this._id = null
    try { if (this.props.match.params._id) this._id = BSON.ObjectID(this.props.match.params._id) } catch (e) {}

    // load stored layouts if any or get default ones
    let layoutView = localStorage.getItem(this._key(false))
    let layoutEdit = localStorage.getItem(this._key(true))
    let layouts = {
      false: layoutView ? Layout.fromString(layoutView) : this.defaultLayout(false),
      true: layoutEdit ? Layout.fromString(layoutEdit) : this.defaultLayout(true)
    }

    let defaultSettings = {
      'Chords.showInline': false,
      'Rhythm.showInline': false,
      'Ascii.split': 0,
      'Ascii.maxConsecutiveSpaces': 1,
      'Ascii.fontSize': 1.0,
      'Ascii.columnCount': 2,
      'Score.staveMode': '',
      'Score.separateUnits': false,
      'Score.displayedUnits': [],
      'Score.showLyrics': true,
      'Score.showStrokes': false,
      'Score.showAccents': false
    }

    // load stored settings if any
    let settings = localStorage.getItem('SongCheat.App.Settings')
    settings = settings ? JSON.parse(settings) : defaultSettings

    // if new settings have been added since they were stored, use their default value
    for (let k in defaultSettings) if (typeof settings[k] === 'undefined') settings[k] = defaultSettings[k]

    // load stored source, mode and filename if any
    let source = '' // localStorage.getItem('SongCheat.App.Source')
    let filename = null // localStorage.getItem('SongCheat.App.Filename')
    let mode = this._id ? localStorage.getItem('SongCheat.App.Mode') : 'edit'

    this.state = {
      source: this._id ? '' : (source || template), // use SongCheat template provided by songcheat-core if none saved yet
      songcheat: null,
      filename: filename || null,
      editMode: mode === 'edit',
      layouts: layouts,
      layout: layouts[mode === 'edit'],
      settings: Map(settings)
    }
  }

  _key (editMode) {
    return 'SongCheat.App.Layout.' + (editMode ? 'Edit' : 'View')
  }

  onDrop (acceptedFiles, rejectedFiles) {
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => this.songcheat(reader.result, file.name)
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.readAsText(file)
    })
  }

  componentWillMount () {
    if (!this._id) this.songcheat(this.state.source)

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
    // if a songcheats _id is given in url
    if (this._id) {
      this.songcheats.findOne({ '_id': this._id }).then(document => {
        if (document) {
          console.warn(`Loaded document with _id ${this._id}`)
          this.songcheat(document.source, null)
          localStorage.setItem('SongCheat.App.LastLoadedId', this._id)
        }
      })
    }
  }

  songcheat (source, filename) {
    try {
      // replace composed chars causing some issues in ACE
      source = Utils.replaceComposedChars(source)
      filename = typeof filename === 'undefined' ? this.state.filename : filename

      // update current source and filename
      this.setState({source, filename})
      localStorage.setItem('SongCheat.App.Source', source)
      localStorage.setItem('SongCheat.App.Filename', filename || '')

      // parse and compile songcheat source
      let songcheat = this.parser.parse(source)
      songcheat = this.compiler.compile(songcheat)

      // when loading a new songcheat, reset displayedUnits to all units
      let settings = this.state.settings
      if (!this._id || this._id.toString() !== localStorage.getItem('SongCheat.App.LastLoadedId')) {
        console.warn(`Resetting displayedUnits since ID ${this._id} <> ${localStorage.getItem('SongCheat.App.LastLoadedId')}`)
        let unitIds = []
        if (songcheat.structure) for (let unit of songcheat.structure) unitIds.push(unit.id)
        settings = this.state.settings.set('Score.displayedUnits', unitIds)
        localStorage.setItem('SongCheat.App.Settings', JSON.stringify(settings))
      } else console.log(`Keeping displayedUnits since ID ${this._id} = ${localStorage.getItem('SongCheat.App.LastLoadedId')}`)

      this.setState({songcheat: songcheat, settings: settings, error: null})
    } catch (e) {
      // change state.songcheat only when loading a new file, otherwise (i.e. when editing) keep current as is
      this.setState({songcheat: filename ? null : this.state.songcheat, error: e.toString()})
      if (!(e instanceof ParserException) && !(e instanceof TokenizerException) && !(e instanceof CompilerException) && !(e instanceof ChordException)) {
        console.error(e)
      }
    }
  }

  onChange (source) {
    // auto-save source after 2.5s if no more change
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => localStorage.setItem('SongCheat.App.Source', source), 2500)

    // recompile songcheat after 0.1 or 0.5s if no more change
    clearTimeout(this.recompileTimer)
    let scoreVisible = this.state.layout.isVisible(4)
    let ms = scoreVisible ? 500 : 100
    // console.warn('Editor contents changed: waiting ' + ms + ' ms before updating')
    this.recompileTimer = setTimeout(() => this.songcheat(source), ms)
  }

  async onSave (source, filename, quiet) {
/*
    if (!this.state.songcheat) {
      this.growl.show({ severity: 'warn', summary: 'SongCheat must be fixed', detail: `Please fix all errors before saving your SongCheat` })
      return
    }
*/
    // logged in: insert or update mongodb document
    if (this.props.authed()) {
      this.songcheat(source)
      return this.save(quiet, source)
    }

    // not logged in: download text file
    let blob = new Blob([source], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, filename)
  }

  async save (quiet, source) {
    if (!this.props.authed()) throw new Error('Cannot save songcheat: not logged in')

    let document = {
      owner_id: this.stitchClient.authedId(),
      source: source || this.state.source,
      artist: this.state.songcheat ? this.state.songcheat.artist : null,
      year: this.state.songcheat ? this.state.songcheat.year : null,
      title: this.state.songcheat && this.state.songcheat.title ? this.state.songcheat.title : '(unkown title)',
      type: this.state.songcheat && this.state.songcheat.type ? this.state.songcheat.type : '(unkown type)'
    }

    try {
      if (this._id) {
        if (!quiet) document.last_modified = new Date()
        let updated = await this.songcheats.updateOne({ '_id': this._id }, { '$set': document })
        console.warn(`Updated ${updated.matchedCount} document`)
        if (updated.matchedCount === 0) throw new Error(`ID ${this._id} not found`)
        this.growl.show({ severity: 'success', summary: 'SongCheat saved', detail: `Sucessfully saved songcheat ${this.defaultFilename()}` })
      } else {
        document.created = new Date()
        document.last_modified = new Date()
        let inserted = await this.songcheats.insertOne(document)
        console.warn(`Inserted document with _id ${inserted.insertedId}`)
        this.growl.show({ severity: 'success', summary: 'SongCheat created', detail: `Sucessfully created songcheat ${this.defaultFilename()}` })
        this.props.history.replace('/' + inserted.insertedId)
        this._id = inserted.insertedId
        localStorage.setItem('SongCheat.App.LastLoadedId', this._id)
      }
    } catch (e) {
      console.error(e)
      this.growl.show({ severity: 'error', summary: 'SongCheat NOT saved', detail: `Error saving songcheat : ${e.message}` })
    }
  }

  force () {
    // this ensures SplitPanes are unmounted and re-rendered with their defaultSize
    this.setState({ clear: true }, () => this.setState({ clear: false }))
  }

  // Apply received (loaded) layout as current
  setLayout (layout) {
    this.setState({layout}, () => this.force())
  }

  // Update current layout in response to user input
  updateLayout (layout) {
    this.setState({ layout })
    localStorage.setItem(this._key(this.state.editMode), layout.stringify())
  }

  // Reset current layout to the default for current mode
  resetLayout () {
    this.setState({layout: this.defaultLayout(this.state.editMode)}, () => this.force())
    localStorage.removeItem(this._key(this.state.editMode))
  }

  // Switch mode edit <-> view
  switchLayout () {
    let prevMode = this.state.editMode
    let nextMode = !this.state.editMode
    localStorage.setItem('SongCheat.App.Mode', nextMode ? 'edit' : 'view')

    // current layout (potentially modified) becomes our new reference for prevMode
    let layouts = { [prevMode]: this.state.layout, [nextMode]: this.state.layouts[nextMode] }
    this.setState({ editMode: nextMode, layouts: layouts, layout: layouts[nextMode] }, () => this.force())
  }

  // Returns default layout for given mode
  defaultLayout (editMode) {
    return new Layout(editMode ? {right: [0, 1, 2, 3, 4], left: [5]} : [0, 1, 2, 3, 4])
  }

  // Default filename used when saving a new songcheat for the first time
  defaultFilename () {
    let filename = ''
    if (this.state.songcheat && this.state.songcheat.title) {
      filename = this.state.songcheat.title
      if (this.state.songcheat.artist) filename += ' (' + this.state.songcheat.artist + (this.state.songcheat.year ? ', ' + this.state.songcheat.year : '') + ')'
    }
    return filename
  }

  // Update filename after user saved songcheat
  updateFilename (filename) {
    this.setState({filename})
    localStorage.setItem('SongCheat.App.Filename', filename || '')
  }

  // Update settings in response to user input
  updateSetting (key, value) {
    let settings = this.state.settings.set(key, value)
    this.setState({settings})
    localStorage.setItem('SongCheat.App.Settings', JSON.stringify(settings))
  }

  getUnitOptions () {
    let options = []
    if (this.state.songcheat && this.state.songcheat.structure) for (let unit of this.state.songcheat.structure) options.push({ value: unit.id, label: unit.name})
    return options
  }

  getDisplayedUnits () {
    let units = []
    let displayedUnits = this.state.settings.get('Score.displayedUnits')
    if (this.state.songcheat && this.state.songcheat.structure) for (let unit of this.state.songcheat.structure) if (displayedUnits.indexOf(unit.id) >= 0) units.push(unit)
    return units
  }

  render () {
    // set document title
    if (this.state.songcheat && this.state.songcheat.title) document.title = this.state.songcheat.title + ' - ' + this.state.songcheat.artist + ', ' + this.state.songcheat.year

    return (<section className='App'>

      <Popup />
      <Growl style={{top: '90px'}} ref={(el) => { this.growl = el }} />

      <header className='App-header' style={{position: 'relative'}}>
        <div style={{ position: 'absolute', left: '5px' }}>
          <Player audioCtx={this.audioCtx} rhythm={false} songcheat={this.state.songcheat} units={this.getDisplayedUnits()} />
        </div>
        <div style={{ position: 'absolute', right: '5px' }}>
          <Button label={this.state.editMode ? 'Switch to View mode' : 'Switch to Edit mode'} onClick={() => this.switchLayout()} />
          {this.state.editLayout && !this.defaultLayout(this.state.editMode).equals(this.state.layout) && <Button label='Reset layout' onClick={() => this.resetLayout()} />}
          <Button label={this.state.editLayout ? 'Done changing layout' : 'Change layout'} onClick={() => this.setState({editLayout: !this.state.editLayout})} />
        </div>
        <h1 className='App-title'>SongCheat &nbsp; ♬ &nbsp; {this.defaultFilename()}</h1>
      </header>

      {this.state.error ? <div className='edit_error'>{this.state.error}</div> : null}

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
          <Chords label='Chords'
            songcheat={this.state.songcheat}
            showInline={this.state.settings.get('Chords.showInline')}
            onShowInline={showInline => this.updateSetting('Chords.showInline', showInline)} />
          <Rhythm label='Rhythm'
            rendering='svg'
            audioCtx={this.audioCtx}
            songcheat={this.state.songcheat}
            showInline={this.state.settings.get('Rhythm.showInline')}
            onShowInline={showInline => this.updateSetting('Rhythm.showInline', showInline)} />
          <Ascii label='Text'
            songcheat={this.state.songcheat}
            units={this.state.songcheat ? this.state.songcheat.structure : []}
            split={this.state.settings.get('Ascii.split')}
            maxConsecutiveSpaces={this.state.settings.get('Ascii.maxConsecutiveSpaces')}
            fontSize={this.state.settings.get('Ascii.fontSize')}
            columnCount={this.state.settings.get('Ascii.columnCount')}
            optionChanged={(key, value) => this.updateSetting('Ascii.' + key, value)} />
          <Score label='Score'
            rendering='canvas'
            audioCtx={this.audioCtx}
            songcheat={this.state.songcheat}
            unitOptions={this.getUnitOptions()}
            displayedUnits={this.state.settings.get('Score.displayedUnits')}
            units={this.getDisplayedUnits()}
            staveMode={this.state.settings.get('Score.staveMode')}
            separateUnits={this.state.settings.get('Score.separateUnits')}
            showLyrics={this.state.settings.get('Score.showLyrics')}
            showStrokes={this.state.settings.get('Score.showStrokes')}
            showAccents={this.state.settings.get('Score.showAccents')}
            filename={this.state.filename}
            optionChanged={(key, value) => this.updateSetting('Score.' + key, value)} />
          {this.state.editMode && <Editor {...this.props}
            label='Editor'
            width='100%'
            text={this.state.source}
            filename={this.state.filename}
            defaultFilename={() => { return this.defaultFilename() }}
            onFilenameChanged={filename => this.updateFilename(filename)}
            onChange={source => this.onChange(source)}
            onSave={(source, filename, quiet) => this.onSave(source, filename, quiet)} />}
        </Patchwork>

      </Dropzone>

    </section>)
  }
}
export default App
