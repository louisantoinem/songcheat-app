import React from 'react'
import ReactDOM from 'react-dom'
import { Route } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import registerServiceWorker from './registerServiceWorker'
import { StitchClientFactory } from "mongodb-stitch";

// app components
import Auth from './Auth'
import App from './App.jsx'
import Browser from './Browser.jsx'
import './index.css'

let appId = "songcheat-stitch-irqmn";
let mongodbService = "mongodb-atlas";
let options = {};

if (process.env.APP_ID) appId = process.env.APP_ID;
if (process.env.MONGODB_SERVICE) mongodbService = process.env.MONGODB_SERVICE;
if (process.env.STITCH_URL) options.baseUrl = process.env.STITCH_URL;

(async function () {

  // create audio context
  let audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext)()

  // get stitch client connection
  let stitchClient = await StitchClientFactory.create(appId, options)
  
  // auhenticate as guest if not authed yet
  if (!stitchClient.isAuthenticated()) await stitchClient.authenticate('anon')

  // get user profile data
  let userData = await stitchClient.userProfile()
  
  // authed() returns true if authed, not as a guest
  let authed = () => { 
    for (let identity of userData.identities) {
      if (identity.provider_type !== 'anon-user') return true
    }
    return false
  }
  
  // get handle on songcheats Collection
  let db = stitchClient.service("mongodb", mongodbService).db("songcheat");
  let songcheats = db.collection("songcheats");

  let props = { audioCtx, stitchClient, songcheats, authed };

  ReactDOM.render(
    <BrowserRouter>
      <div>
        <Route exact path="/" render={routeProps => 
          <div>
            <Auth {...props} {...routeProps}/>
            <Browser {...props} {...routeProps}/>
          </div>
        }/>
        <Route path="/:_id" render={routeProps => 
          <div>
            <Auth {...props} {...routeProps}/>
            <App {...props} {...routeProps}/>
          </div>
        }/>
      </div>
    </BrowserRouter>,
    document.getElementById('root'))
})()

registerServiceWorker()
