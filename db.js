db.songcheats.createIndex(
  {
    artist: 'text',
    title: 'text',
    type: 'text',
    source: 'text'
  },
  {
    weights: {
      artist: 10,
      title: 10,
	   type: 5,
      source: 1
    },
    name: 'FullTextSearchIndex'
  }
 )
