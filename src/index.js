import React, { useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { Route } from 'react-router'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import registerServiceWorker from './registerServiceWorker'

// app components
import Auth from './Auth'
import App from './App.jsx'
import Browser from './Browser.jsx'
import createApi from './api'
import './index.css'

// create audio context once for the whole app
const audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext)()

// Bridge between Auth0's hook-based API and the (class-based) app components:
// builds the REST client with a token getter and passes auth state down as props.
function Root () {
  const { isLoading, isAuthenticated, user, getAccessTokenSilently, loginWithRedirect, logout } = useAuth0()

  const getToken = useCallback(async () => {
    if (!isAuthenticated) return null
    try { return await getAccessTokenSilently() } catch (e) { console.error(e); return null }
  }, [isAuthenticated, getAccessTokenSilently])

  const api = useMemo(() => createApi(getToken), [getToken])

  if (isLoading) return <div className='AppLoading'>Loading…</div>

  // authed() returns true if signed in (i.e. not an anonymous visitor)
  const authed = () => isAuthenticated

  const props = {
    audioCtx,
    api,
    authed,
    user,
    userSub: user ? user.sub : null,
    loginWithRedirect,
    logout
  }

  return (
    <BrowserRouter>
      <div>
        <Route exact path='/' render={routeProps =>
          <div>
            <Auth {...props} {...routeProps} />
            <Browser {...props} {...routeProps} />
          </div>
        } />
        <Route path='/:_id' render={routeProps =>
          <div>
            <Auth {...props} {...routeProps} />
            <App {...props} {...routeProps} />
          </div>
        } />
      </div>
    </BrowserRouter>
  )
}

ReactDOM.render(
  <Auth0Provider
    domain={process.env.REACT_APP_AUTH0_DOMAIN}
    clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: process.env.REACT_APP_AUTH0_AUDIENCE
    }}
  >
    <Root />
  </Auth0Provider>,
  document.getElementById('root'))

registerServiceWorker()
