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
import './App.scss'
import './Popup.scss'
import 'primereact/resources/primereact.min.css'
import 'primereact/resources/themes/omega/theme.css'
import 'primeicons/primeicons.css'
import 'font-awesome/css/font-awesome.css'

class App extends Component {

  constructor(props) {
    super(props)
    this.parser = new Parser()
    this.compiler = new Compiler(0)
    this.audioCtx = this.props.audioCtx
    this.api = this.props.api

    // get _id from url, if it's a valid ObjectId (e.g. '/new' is not => null)
    this._id = null
    if (this.props.match.params._id && /^[a-f0-9]{24}$/i.test(this.props.match.params._id)) this._id = this.props.match.params._id

    // load stored layouts if any or get default ones
    let layoutView = localStorage.getItem(this._key(false))
    let layoutEdit = localStorage.getItem(this._key(true))
    let layouts = {
      false: layoutView ? Layout.fromString(layoutView) : this.defaultLayout(false),
      true: layoutEdit ? Layout.fromString(layoutEdit) : this.defaultLayout(true)
    }

    let defaultSettings = this.defaultSettings()

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

  _key(editMode) {
    return 'SongCheat.App.Layout.' + (editMode ? 'Edit' : 'View')
  }

  defaultSettings(isMobile = false) {
    return {
      'Chords.showInline': false,
      'Rhythm.showInline': false,
      'Ascii.split': 0,
      'Ascii.maxConsecutiveSpaces': 1,
      'Ascii.fontSize': 1.0,
      'Ascii.columnCount': isMobile ? 1 : 2,
      'Score.staveMode': '',
      'Score.separateUnits': false,
      'Score.displayedUnits': [],
      'Score.showLyrics': true,
      'Score.showStrokes': false,
      'Score.showAccents': false,
      'Score.barsPerLine': isMobile ? 1 : 4,
      'Score.rendering': 'canvas'
    }
  }

  resetSettings() {
    const isMobile = window.innerWidth <= 600
    let settings = Map(this.defaultSettings(isMobile))

    // select all units
    if (this.state.songcheat && this.state.songcheat.structure) {
      const unitIds = this.state.songcheat.structure.map(unit => unit.id)
      settings = settings.set('Score.displayedUnits', unitIds)
    }

    this.setState({ settings })
    localStorage.setItem('SongCheat.App.Settings', JSON.stringify(settings))
  }

  onDrop(acceptedFiles, rejectedFiles) {
    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => this.songcheat(reader.result, file.name, true)
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.readAsText(file)
    })
  }

  componentWillMount() {
    if (!this._id) this.songcheat(this.state.source, null, true)

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

  componentDidMount() {

    // on mobile, force single-panel layout (only if saved layout has multiple panels) and single-column text and score view
    if (window.innerWidth <= 600) {
      let settings = this.state.settings.set('Ascii.columnCount', this.defaultSettings(true)['Ascii.columnCount'])
      settings = settings.set('Score.barsPerLine', this.defaultSettings(true)['Score.barsPerLine'])

      if (!this.state.layout.root.isLeave() || this.state.layout.root.components.length > 4) {
        localStorage.removeItem(this._key(false))
        localStorage.removeItem(this._key(true))
        const mobileLayout = this.defaultLayout(false)
        this.setState({ layout: mobileLayout, layouts: { ...this.state.layouts, false: mobileLayout }, settings })
      } else this.setState({ settings })

      localStorage.setItem('SongCheat.App.Settings', JSON.stringify(settings))
    }

    // if a songcheats _id is given in url
    if (this._id) {
      this.api.getSongcheat(this._id).then(document => {
        if (document) {
          console.warn(`Loaded document with _id ${this._id}`)
          this.owner_id = document.owner_id
          this.songcheat(document.source, null, true)
          localStorage.setItem('SongCheat.App.LastLoadedId', this._id)
        }
      }).catch(e => console.error(e))
    }
  }

  songcheat(source, filename, changing) {
    try {
      // replace composed chars causing some issues in ACE
      source = Utils.replaceComposedChars(source)
      filename = typeof filename === 'undefined' ? this.state.filename : filename

      // update current source and filename
      this.setState({ source, filename })
      localStorage.setItem('SongCheat.App.Source', source)
      localStorage.setItem('SongCheat.App.Filename', filename || '')

      // parse and compile songcheat source
      let songcheat = this.parser.parse(source)
      songcheat = this.compiler.compile(songcheat)

      // when loading a new songcheat, reset displayedUnits to all units
      let settings = this.state.settings
      if (changing && (!this._id || this._id !== localStorage.getItem('SongCheat.App.LastLoadedId'))) {
        console.warn(`Resetting displayedUnits since ID ${this._id} <> ${localStorage.getItem('SongCheat.App.LastLoadedId')}`)
        let unitIds = []
        if (songcheat.structure) for (let unit of songcheat.structure) unitIds.push(unit.id)
        settings = this.state.settings.set('Score.displayedUnits', unitIds)
        localStorage.setItem('SongCheat.App.Settings', JSON.stringify(settings))
      } else console.log(`Keeping displayedUnits since ID ${this._id} = ${localStorage.getItem('SongCheat.App.LastLoadedId')}`)

      this.setState({ songcheat: songcheat, settings: settings, error: null })
    } catch (e) {
      // change state.songcheat only when loading a new file, otherwise (i.e. when editing) keep current as is
      this.setState({ songcheat: filename ? null : this.state.songcheat, error: e.toString() })
      if (!(e instanceof ParserException) && !(e instanceof TokenizerException) && !(e instanceof CompilerException) && !(e instanceof ChordException)) {
        console.error(e)
      }
    }
  }

  onChange(source) {
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

  async onSave(source, filename, quiet) {
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

  async save(quiet, source) {
    if (!this.props.authed()) throw new Error('Cannot save songcheat: not logged in')

    // owner_id and created/last_modified are set by the API (from the Auth0 token)
    let document = {
      source: source || this.state.source,
      artist: this.state.songcheat ? this.state.songcheat.artist : null,
      year: this.state.songcheat ? this.state.songcheat.year : null,
      title: this.state.songcheat && this.state.songcheat.title ? this.state.songcheat.title : '(unkown title)',
      type: this.state.songcheat && this.state.songcheat.type ? this.state.songcheat.type : '(unkown type)'
    }

    // if currently edited songcheat is owned by someone else, create a fork
    if (this.owner_id && this.props.userSub !== this.owner_id) {
      this.owner_id = this.props.userSub
      document.forked_songcheat_id = this._id
      this._id = null
    }

    try {
      if (this._id) {
        await this.api.updateSongcheat(this._id, document, quiet)
        console.warn(`Updated document with _id ${this._id}`)
        this.growl.show({ severity: 'success', summary: 'SongCheat saved', detail: `Sucessfully saved songcheat ${this.defaultFilename()}` })
      } else {
        let inserted = await this.api.createSongcheat(document)
        console.warn(`Inserted document with _id ${inserted._id}`)
        this.growl.show({ severity: 'success', summary: 'SongCheat created', detail: `Sucessfully created songcheat ${this.defaultFilename()}` })
        this.props.history.replace('/' + inserted._id)
        this._id = inserted._id
        this.owner_id = inserted.owner_id
        localStorage.setItem('SongCheat.App.LastLoadedId', this._id)
      }
    } catch (e) {
      console.error(e)
      this.growl.show({ severity: 'error', summary: 'SongCheat NOT saved', detail: `Error saving songcheat : ${e.message}` })
    }
  }

  force() {
    // this ensures SplitPanes are unmounted and re-rendered with their defaultSize
    this.setState({ clear: true }, () => this.setState({ clear: false }))
  }

  // Apply received (loaded) layout as current
  setLayout(layout) {
    this.setState({ layout }, () => this.force())
  }

  // Update current layout in response to user input
  updateLayout(layout) {
    this.setState({ layout })
    localStorage.setItem(this._key(this.state.editMode), layout.stringify())
  }

  // Reset current layout to the default for current mode
  resetLayout() {
    this.setState({ layout: this.defaultLayout(this.state.editMode) }, () => this.force())
    localStorage.removeItem(this._key(this.state.editMode))
  }

  // Switch mode edit <-> view
  switchLayout() {
    let prevMode = this.state.editMode
    let nextMode = !this.state.editMode
    localStorage.setItem('SongCheat.App.Mode', nextMode ? 'edit' : 'view')

    // current layout (potentially modified) becomes our new reference for prevMode
    let layouts = { [prevMode]: this.state.layout, [nextMode]: this.state.layouts[nextMode] }
    this.setState({ editMode: nextMode, layouts: layouts, layout: layouts[nextMode] }, () => this.force())
  }

  // Returns default layout for given mode
  defaultLayout(editMode) {
    if (window.innerWidth <= 600) return Layout.fromString('{"root":{"components":[0,1,3,4],"selectedIndex":2}}')
    return new Layout(editMode ? { left: [5], right: [0, 1, 2, 3, 4] } : { left: [0, 1, 2], right: [3, 4], position: 660 }) // 660 = embedded video width
  }

  // Default filename used when saving a new songcheat for the first time
  defaultFilename() {
    let filename = ''
    if (this.state.songcheat && this.state.songcheat.title) {
      filename = this.state.songcheat.title
      if (this.state.songcheat.artist) filename += ' (' + this.state.songcheat.artist + (this.state.songcheat.year ? ', ' + this.state.songcheat.year : '') + ')'
    }
    return filename
  }

  // Update filename after user saved songcheat
  updateFilename(filename) {
    this.setState({ filename })
    localStorage.setItem('SongCheat.App.Filename', filename || '')
  }

  // Update settings in response to user input
  updateSetting(key, value) {
    let settings = this.state.settings.set(key, value)
    this.setState({ settings })
    localStorage.setItem('SongCheat.App.Settings', JSON.stringify(settings))
  }

  getUnitOptions() {
    let options = []
    if (this.state.songcheat && this.state.songcheat.structure) for (let unit of this.state.songcheat.structure) options.push({ value: unit.id, label: unit.name })
    return options
  }

  getDisplayedUnits() {
    let units = []
    let displayedUnits = this.state.settings.get('Score.displayedUnits')
    if (this.state.songcheat && this.state.songcheat.structure) for (let unit of this.state.songcheat.structure) if (displayedUnits.indexOf(unit.id) >= 0) units.push(unit)
    return units
  }

  render() {
    // set document title
    if (this.state.songcheat && this.state.songcheat.title) document.title = this.state.songcheat.title + ' - ' + this.state.songcheat.artist + ', ' + this.state.songcheat.year

    return (<section className='App'>

      <Popup />
      <Growl style={{ top: '90px' }} ref={(el) => { this.growl = el }} />

      <header className='App-header'>
        <div className='header-player'>
          <Player
            onPlay={() => {
              if (this.state.songcheat && this.state.songcheat.offset >= 0) {
                if (this.videoPlayer) this.videoPlayer.seekTo(this.state.songcheat.offset, 'seconds')
                this.setState({ playing: true })
              }
            }}
            onPause={playing => this.setState({ playing })}
            onStop={() => this.setState({ playing: false })}
            audioCtx={this.audioCtx}
            rhythm={false}
            songcheat={this.state.songcheat}
            units={this.getDisplayedUnits()} />
        </div>
        <div className='header-actions'>
          <Button label={this.state.editMode ? 'Switch to View mode' : 'Switch to Edit mode'} onClick={() => this.switchLayout()} />
          {this.state.editLayout && !this.defaultLayout(this.state.editMode).equals(this.state.layout) && <Button label='Reset layout' onClick={() => this.resetLayout()} />}
          <Button label={this.state.editLayout ? 'Done changing layout' : 'Change layout'} onClick={() => this.setState({ editLayout: !this.state.editLayout })} />
        </div>
        <h1 className='App-title'><span className='app-name'>SongCheat &nbsp; ♬ &nbsp; </span>{this.defaultFilename()}</h1>
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
          <General label='General'
            playing={this.state.playing}
            songcheat={this.state.songcheat}
            onResetSettings={() => this.resetSettings()}
            ref={c => this.videoPlayer = c ? c.videoPlayer : null} />
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
            rendering={this.state.settings.get('Score.rendering')}
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
            barsPerLine={this.state.settings.get('Score.barsPerLine')}
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
