// Thin REST client for the SongCheat API (replaces the MongoDB Stitch SDK).
// `getToken` is an async function returning the current Auth0 access token,
// or null when the visitor is not authenticated (reads stay public).

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8282/api/v1'

// the API serializes dates as ISO strings; revive them so the rest of the app
// can keep calling .getTime() / timeago.ago() as it did with Stitch
function reviveDates (doc) {
  if (doc && doc.created) doc.created = new Date(doc.created)
  if (doc && doc.last_modified) doc.last_modified = new Date(doc.last_modified)
  return doc
}

export default function createApi (getToken) {

  async function request (path, options = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers)
    const token = getToken ? await getToken() : null
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(API_URL + path, Object.assign({}, options, { headers }))

    if (!res.ok) {
      let message = res.statusText
      try { const body = await res.json(); if (body && body.error) message = body.error } catch (e) { /* no json body */ }
      const err = new Error(message)
      err.status = res.status
      throw err
    }

    if (res.status === 204) return null
    return res.json()
  }

  return {
    listSongcheats ({ search, mode, nofork, sortby } = {}) {
      const qs = new URLSearchParams()
      if (search) qs.set('search', search)
      if (mode) qs.set('mode', mode)
      if (nofork) qs.set('nofork', 'true')
      if (sortby) qs.set('sortby', sortby)
      return request('/songcheats?' + qs.toString()).then(list => list.map(reviveDates))
    },

    getSongcheat (id) {
      return request('/songcheats/' + id).then(reviveDates)
    },

    createSongcheat (doc) {
      return request('/songcheats', { method: 'POST', body: JSON.stringify(doc) }).then(reviveDates)
    },

    updateSongcheat (id, doc, quiet) {
      return request('/songcheats/' + id + (quiet ? '?quiet=true' : ''), { method: 'PUT', body: JSON.stringify(doc) }).then(reviveDates)
    },

    listRatings () {
      return request('/ratings')
    },

    setFavorite (songcheatId, favorite) {
      return request('/ratings/' + songcheatId, { method: 'PUT', body: JSON.stringify({ favorite }) })
    }
  }
}
