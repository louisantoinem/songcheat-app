import React, {Component} from 'react'
import { Link } from 'react-router-dom'

// css
import './Auth.scss'

export default class Auth extends Component {
  render () {
    let authed = this.props.authed()
    let user = this.props.user
    let logout = () => this.props.logout({ logoutParams: { returnTo: window.location.origin } })
    let login = () => this.props.loginWithRedirect()
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
        <button onClick={login} className='signin-button'>
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
            <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
            <path d='M7 11V7a5 5 0 0 1 10 0v4' />
          </svg>
          Sign in
        </button>
      </div> }
    </div>)
  }
}
