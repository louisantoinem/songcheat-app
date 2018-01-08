import React, { Component } from 'react'
import Popup from 'react-popup'
import Dropzone from 'react-dropzone'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'

import './App.css'
import './Popup.css'
import 'react-tabs/style/react-tabs.css'

// app components
import Editor from './Editor'
import General from './General'
import Chords from './Chords'
import Rhythm from './Rhythm'
import Sheet from './Sheet'
import Prompt from './Prompt'
import Ascii from './Ascii'
import Score from './Score'

// business modules
import { Utils, Parser, ParserException, Compiler, CompilerException } from 'songcheat-core'
import template from 'songcheat-core/dist/template.json'

class App extends Component {

  constructor (props) {
    super(props)
    this.parser = new Parser()
    this.compiler = new Compiler(0)
    this.state = {
      source: null,
      songcheat: null,
      showChordIndex: null,
      showRhythmIndex: null,
      showPartIndex: null,
      showUnitIndex: null,
      filename: null
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

  onCursorChange (selection) {
    try {
      let cursor = selection.getCursor()
      let k = this.parser.getPrecedingKeyword(this.state.source, cursor.row + 1)
      if (k) {
        console.info('First keyword before cursor: ' + k.keyword)
        if (this.state.showChordIndex !== k.chordIndex || this.state.showRhythmIndex !== k.rhythmIndex || this.state.showPartIndex !== k.partIndex || this.state.showUnitIndex !== k.unitIndex) {
          this.setState({showChordIndex: k.chordIndex, showRhythmIndex: k.rhythmIndex, showPartIndex: k.partIndex, showUnitIndex: k.unitIndex})
        }
      }
    } catch (e) {
      if (!(e instanceof ParserException) && !(e instanceof CompilerException)) {
        console.error(e)
      }
    }
  }

  getEditorPanel () {
    if (this.state.error) {
      return <div className='error'>{this.state.error}</div>
    }
    if (!this.state.songcheat) {
      return <div className='error'>No songcheat ?!</div>
    }

    if (this.state.songcheat.title) document.title = this.state.songcheat.title + ' - ' + this.state.songcheat.artist + ', ' + this.state.songcheat.year

    if (this.state.showChordIndex !== null) {
      return <Chords chords={this.state.songcheat.chords.slice(this.state.showChordIndex, this.state.showChordIndex + 1)} />
    }
    if (this.state.showRhythmIndex !== null) {
      return <Rhythm songcheat={this.state.songcheat} rhythms={this.state.songcheat.rhythms.slice(this.state.showRhythmIndex, this.state.showRhythmIndex + 1)} />
    }
    if (this.state.showPartIndex !== null) {
      // create a dummy unit with no lyrics for each selected part
      let units = []
      for (let part of this.state.songcheat.parts.slice(this.state.showPartIndex, this.state.showPartIndex + 1)) units.push({part: part})
      return <Sheet songcheat={this.state.songcheat} units={units} />
    }
    if (this.state.showUnitIndex !== null) {
      // show selected units
      return <Sheet songcheat={this.state.songcheat} units={this.state.songcheat.structure.slice(this.state.showUnitIndex, this.state.showUnitIndex + 1)} />
    }

    // show general song metadata
    return <General songcheat={this.state.songcheat} />
  }

  render () {
    return (<div className='App'>

      <Popup />

      {/* <header className='App-header'>
        <h1 className='App-title'>Welcome to SongCheat ♬</h1>
      </header> */}

      {/* drop zone cannot be over the editor since it would prevent clicking in the editor (drop zone needs pointer events to detect drag) */}
      {/* it also prevents scrolling the right panel, so give it only 10% width */}
      <Dropzone
        style={{ position: 'fixed', right: '0px', bottom: '0px', width: '10%', height: '100%', opacity: '0.2', zIndex: 1 /* >= right panel */ }}
        acceptStyle={{ backgroundColor: 'green', width: '100%' }}
        rejectStyle={{ backgroundColor: 'red', width: '100%' }}
        disableClick
        multiple={false}
        accept='text/plain'
        onDrop={this.onDrop.bind(this)} />

      <Tabs>
        <TabList>
          <Tab>General</Tab>
          <Tab>Chords</Tab>
          <Tab>Rhythms</Tab>
          <Tab>Score</Tab>
          <Tab>Ascii</Tab>
          <Tab>Editor</Tab>
        </TabList>

        <TabPanel>
          <General songcheat={this.state.songcheat} />
        </TabPanel>

        <TabPanel>
          <Chords chords={this.state.songcheat ? this.state.songcheat.chords : []} />
        </TabPanel>

        <TabPanel>
          <Rhythm songcheat={this.state.songcheat} rhythms={this.state.songcheat ? this.state.songcheat.rhythms : []} />
        </TabPanel>

        <TabPanel>
          <Score songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} />
        </TabPanel>

        <TabPanel>
          <Ascii songcheat={this.state.songcheat} units={this.state.songcheat ? this.state.songcheat.structure : []} maxConsecutiveSpaces={1} split={0} showDots={false} />
        </TabPanel>

        <TabPanel>
          <div className='rightPanel'>
            {this.getEditorPanel()}
          </div>
          <Editor width='50%' text={this.state.source} filename={this.state.filename} onCursorChange={(selection) => this.onCursorChange(selection)} onChange={source => this.songcheat(source)} />,
          </TabPanel>

      </Tabs>

    </div>)
  }
}
export default App
