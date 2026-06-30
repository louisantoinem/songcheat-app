import React, {Component} from 'react'
import { Link } from 'react-router-dom'

// css
import './Auth.scss'

export default class Auth extends Component {
  render () {
    let authed = this.props.authed()
    let user = this.props.user
    let logout = () => this.props.logout({ logoutParams: { returnTo: window.location.origin } })
    let login = (connection) => this.props.loginWithRedirect({ authorizationParams: { connection } })
    return (<div className='Auth'>
      { this.props.match.params._id && <div className='home-link'><Link to={'/'}>&#8249; Back to list</Link></div> }
      { authed && <div className='login-header'>
        { user && user.picture ? <img alt='profile' src={user.picture} className='profile-pic' /> : null }
        <span className='login-text'>
          <span className='username'>{ user && user.name ? user.name : 'Guest' }</span>
          <a className='logout' onClick={logout}>(sign out)</a>
        </span>
      </div> }
      { !authed && <div className='login-links-panel'>
        <div onClick={() => login('google-oauth2')} className='signin-button'>
          <span className='signin-button-text'>Sign in with &nbsp;</span>
          <svg version='1.1' xmlns='http://www.w3.org/2000/svg' width='18px' height='18px' viewBox='0 0 48 48'>
            <g>
              <path fill='#EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z' />
              <path fill='#4285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z' />
              <path fill='#FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z' />
              <path fill='#34A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z' />
              <path fill='none' d='M0 0h48v48H0z' />
            </g>
          </svg>
        </div>
        <div onClick={() => login('facebook')} className='signin-button'>
          <span className='signin-button-text'>Sign in with &nbsp;</span>
          <div className='facebook-signin-logo' />
        </div>
      </div> }
    </div>)
  }
}
