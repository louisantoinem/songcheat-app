import React from 'react'
import ReactDOM from 'react-dom'
import registerServiceWorker from './registerServiceWorker'
import { StitchClientFactory } from "mongodb-stitch";
import App from './App.jsx'
import './index.css'

let appId = "songcheat-stitch-irqmn";
let mongodbService = "mongodb-atlas";
let options = {};

if (process.env.APP_ID) appId = process.env.APP_ID;
if (process.env.MONGODB_SERVICE) mongodbService = process.env.MONGODB_SERVICE;
if (process.env.STITCH_URL) options.baseUrl = process.env.STITCH_URL;

let stitchClientPromise = StitchClientFactory.create(appId, options);

stitchClientPromise.then(stitchClient => {
  let db = stitchClient.service("mongodb", mongodbService).db("songcheat");
  let songcheats = db.collection("songcheats");
  let props = { stitchClient, songcheats };
  ReactDOM.render(<App {...props} />, document.getElementById('root'))
})

registerServiceWorker()
