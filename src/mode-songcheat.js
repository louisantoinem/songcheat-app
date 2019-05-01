import ace from 'brace'
import lang from 'brace'

ace.define('ace/mode/songcheat_highlight_rules', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text_highlight_rules'], function (acequire, exports, module) {
  exports.reservedKeywords = ('%|ARTIST|TITLE|YEAR|DIFFICULTY|VIDEO|OFFSET|SOURCE|TUTORIAL|COMMENT|MODE|TUNING|CAPO|KEY|TIME|TEMPO|SHUFFLE|CHORD|BLOCK|STRUCTURE|RHYTHM|PART')
  exports.languageConstructs = ('')

  var SongcheatHighlightRules = function () {
    // regexp must not have capturing parentheses
    // regexps are ordered -> the first match is used

    this.$rules = {
      'start': [{
        token: 'empty_line',
        regex: '^$'
      },
        { token: 'keyword',
          regex: '^(?:ARTIST|TITLE|YEAR|TYPE|DIFFICULTY|VIDEO|OFFSET|SOURCE|TUTORIAL|COMMENT|MODE|TUNING|CAPO|KEY|TIME|TEMPO|SHUFFLE|CHORD|BLOCK|STRUCTURE|RHYTHM|PART)'
        },
        { token: 'comment',
          regex: '^ *#.*$'
        },
        {
          defaultToken: 'string'
        }]
    }
  };

  (function () {
    this.addRules = function (rules, prefix) {
      if (!prefix) {
        for (let key in rules) {
          this.$rules[key] = rules[key]
        }
        return
      }
      for (let key in rules) {
        var state = rules[key]
        for (var i = 0; i < state.length; i++) {
          var rule = state[i]
          if (rule.next || rule.onMatch) {
            if (typeof rule.next === 'string') {
              if (rule.next.indexOf(prefix) !== 0) {
                rule.next = prefix + rule.next
              }
            }
            if (rule.nextState && rule.nextState.indexOf(prefix) !== 0) {
              rule.nextState = prefix + rule.nextState
            }
          }
        }
        this.$rules[prefix + key] = state
      }
    }

    this.getRules = function () {
      return this.$rules
    }

    this.embedRules = function (HighlightRules, prefix, escapeRules, states, append) {
      var embedRules = typeof HighlightRules === 'function'
            ? new HighlightRules().getRules()
            : HighlightRules
      if (states) {
        for (var i = 0; i < states.length; i++) {
          states[i] = prefix + states[i]
        }
      } else {
        states = []
        for (var key in embedRules) { states.push(prefix + key) }
      }

      this.addRules(embedRules, prefix)

      if (escapeRules) {
        var addRules = Array.prototype[append ? 'push' : 'unshift']
        for (let i = 0; i < states.length; i++) {
          addRules.apply(this.$rules[states[i]], lang.deepCopy(escapeRules))
        }
      }

      if (!this.$embeds) {
        this.$embeds = []
      }
      this.$embeds.push(prefix)
    }

    this.getEmbeds = function () {
      return this.$embeds
    }

    var pushState = function (currentState, stack) {
      if (currentState !== 'start' || stack.length) {
        stack.unshift(this.nextState, currentState)
      }
      return this.nextState
    }
    var popState = function (currentState, stack) {
        // if (stack[0] === currentState)
      stack.shift()
      return stack.shift() || 'start'
    }

    this.normalizeRules = function () {
      var id = 0
      var rules = this.$rules
      function processState (key) {
        var state = rules[key]
        state.processed = true
        for (let i = 0; i < state.length; i++) {
          var rule = state[i]
          var toInsert = null
          if (Array.isArray(rule)) {
            toInsert = rule
            rule = {}
          }
          if (!rule.regex && rule.start) {
            rule.regex = rule.start
            if (!rule.next) { rule.next = [] }
            rule.next.push({
              defaultToken: rule.token
            }, {
              token: rule.token + '.end',
              regex: rule.end || rule.start,
              next: 'pop'
            })
            rule.token = rule.token + '.start'
            rule.push = true
          }
          var next = rule.next || rule.push
          if (next && Array.isArray(next)) {
            var stateName = rule.stateName
            if (!stateName) {
              stateName = rule.token
              if (typeof stateName !== 'string') {
                stateName = stateName[0] || ''
              }
              if (rules[stateName]) { stateName += id++ }
            }
            rules[stateName] = next
            rule.next = stateName
            processState(stateName)
          } else if (next === 'pop') {
            rule.next = popState
          }

          if (rule.push) {
            rule.nextState = rule.next || rule.push
            rule.next = pushState
            delete rule.push
          }

          if (rule.rules) {
            for (var r in rule.rules) {
              if (rules[r]) {
                if (rules[r].push) { rules[r].push.apply(rules[r], rule.rules[r]) }
              } else {
                rules[r] = rule.rules[r]
              }
            }
          }
          var includeName = typeof rule === 'string' ? rule : rule.include
          if (includeName) {
            if (Array.isArray(includeName)) {
              toInsert = includeName.map(function (x) { return rules[x] })
            } else {
              toInsert = rules[includeName]
            }
          }

          if (toInsert) {
            var args = [i, 1].concat(toInsert)
            if (rule.noEscape) { args = args.filter(function (x) { return !x.next }) }
            state.splice.apply(state, args)
                    // skip included rules since they are already processed
                    // i += args.length - 3;
            i--
          }

          if (rule.keywordMap) {
            rule.token = this.createKeywordMapper(
                        rule.keywordMap, rule.defaultToken || 'text', rule.caseInsensitive
                    )
            delete rule.defaultToken
          }
        }
      }
      Object.keys(rules).forEach(processState, this)
    }

    this.createKeywordMapper = function (map, defaultToken, ignoreCase, splitChar) {
      var keywords = Object.create(null)
      Object.keys(map).forEach(function (className) {
        var a = map[className]
        if (ignoreCase) {
          a = a.toLowerCase()
        }
        var list = a.split(splitChar || '|')
        for (var i = list.length; i--;) {
          keywords[list[i]] = className
        }
      })
        // in old versions of opera keywords["__proto__"] sets prototype
        // even on objects with __proto__=null
      if (Object.getPrototypeOf(keywords)) {
        keywords.__proto__ = null
      }
      this.$keywordList = Object.keys(keywords)
      map = null
      return ignoreCase
            ? function (value) { return keywords[value.toLowerCase()] || defaultToken }
            : function (value) { return keywords[value] || defaultToken }
    }

    this.getKeywords = function () {
      return this.$keywords
    }
  }).call(SongcheatHighlightRules.prototype)

  exports.SongcheatHighlightRules = SongcheatHighlightRules
})

ace.define('ace/mode/folding/cstyle', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/range', 'ace/mode/folding/fold_mode'], function (acequire, exports, module) {
  var oop = acequire('../../lib/oop')
  var Range = acequire('../../range').Range
  var BaseFoldMode = acequire('./fold_mode').FoldMode

  var FoldMode = exports.FoldMode = function (commentRegex) {
    if (commentRegex) {
      this.foldingStartMarker = new RegExp(
            this.foldingStartMarker.source.replace(/\|[^|]*?$/, '|' + commentRegex.start)
        )
      this.foldingStopMarker = new RegExp(
            this.foldingStopMarker.source.replace(/\|[^|]*?$/, '|' + commentRegex.end)
        )
    }
  }
  oop.inherits(FoldMode, BaseFoldMode);

  (function () {
    this.foldingStartMarker = /([{[(])[^}]\)]*$|^\s*(\/\*)/
    this.foldingStopMarker = /^[^[{(]*([}]\)])|^[\s*]*(\*\/)/
    this.singleLineBlockCommentRe = /^\s*(\/\*).*\*\/\s*$/
    this.tripleStarBlockCommentRe = /^\s*(\/\*\*\*).*\*\/\s*$/
    this.startRegionRe = /^\s*(\/\*|\/\/)#?region\b/
    this._getFoldWidgetBase = this.getFoldWidget
    this.getFoldWidget = function (session, foldStyle, row) {
      var line = session.getLine(row)

      if (this.singleLineBlockCommentRe.test(line)) {
        if (!this.startRegionRe.test(line) && !this.tripleStarBlockCommentRe.test(line)) { return '' }
      }

      var fw = this._getFoldWidgetBase(session, foldStyle, row)

      if (!fw && this.startRegionRe.test(line)) { return 'start' } // lineCommentRegionStart

      return fw
    }

    this.getFoldWidgetRange = function (session, foldStyle, row, forceMultiline) {
      var line = session.getLine(row)

      if (this.startRegionRe.test(line)) {
        return this.getCommentRegionBlock(session, line, row)
      }

      let match = line.match(this.foldingStartMarker)
      if (match) {
        var i = match.index

        if (match[1]) {
          return this.openingBracketBlock(session, match[1], row, i)
        }

        var range = session.getCommentFoldRange(row, i + match[0].length, 1)

        if (range && !range.isMultiLine()) {
          if (forceMultiline) {
            range = this.getSectionRange(session, row)
          } else if (foldStyle !== 'all') { range = null }
        }

        return range
      }

      if (foldStyle === 'markbegin') {
        return
      }

      match = line.match(this.foldingStopMarker)
      if (match) {
        let i = match.index + match[0].length

        if (match[1]) {
          return this.closingBracketBlock(session, match[1], row, i)
        }

        return session.getCommentFoldRange(row, i, -1)
      }
    }

    this.getSectionRange = function (session, row) {
      var line = session.getLine(row)
      var startIndent = line.search(/\S/)
      var startRow = row
      var startColumn = line.length
      row = row + 1
      var endRow = row
      var maxRow = session.getLength()
      while (++row < maxRow) {
        line = session.getLine(row)
        var indent = line.search(/\S/)
        if (indent === -1) {
          continue
        }
        if (startIndent > indent) {
          break
        }
        var subRange = this.getFoldWidgetRange(session, 'all', row)

        if (subRange) {
          if (subRange.start.row <= startRow) {
            break
          } else if (subRange.isMultiLine()) {
            row = subRange.end.row
          } else if (startIndent === indent) {
            break
          }
        }
        endRow = row
      }

      return new Range(startRow, startColumn, endRow, session.getLine(endRow).length)
    }
    this.getCommentRegionBlock = function (session, line, row) {
      var startColumn = line.search(/\s*$/)
      var maxRow = session.getLength()
      var startRow = row

      var re = /^\s*(?:\/\*|\/\/|--)#?(end)?region\b/
      var depth = 1
      while (++row < maxRow) {
        line = session.getLine(row)
        var m = re.exec(line)
        if (!m) continue
        if (m[1]) depth--
        else depth++

        if (!depth) break
      }

      var endRow = row
      if (endRow > startRow) {
        return new Range(startRow, startColumn, endRow, line.length)
      }
    }
  }).call(FoldMode.prototype)
})

ace.define('ace/mode/songcheat', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/songcheat_highlight_rules', 'ace/range', 'ace/mode/folding/cstyle', 'ace/mode/behaviour/cstyle'], function (acequire, exports, module) {
  var oop = acequire('../lib/oop')
  var TextMode = acequire('./text').Mode
  var SongcheatHighlightRules = acequire('./songcheat_highlight_rules').SongcheatHighlightRules
  var Range = acequire('../range').Range
  var CStyleFoldMode = acequire('./folding/cstyle').FoldMode
  var CstyleBehaviour = acequire('./behaviour/cstyle').CstyleBehaviour

  var Mode = function () {
    this.HighlightRules = SongcheatHighlightRules
    this.foldingRules = new CStyleFoldMode()
    this.$behaviour = new CstyleBehaviour()
  }
  oop.inherits(Mode, TextMode);

  (function () {
    this.lineCommentStart = '#'

    this.getNextLineIndent = function (state, line, tab) {
      var indent = this.$getIndent(line)

      var tokenizedLine = this.getTokenizer().getLineTokens(line, state)
      var tokens = tokenizedLine.tokens

      if (tokens.length && tokens[tokens.length - 1].type === 'comment') {
        return indent
      }

      if (state === 'start') {
        let match = line.match(/^.*[{([:]\s*$/)
        if (match) {
          indent += tab
        }
      }

      return indent
    }

    var outdents = {
      'pass': 1,
      'return': 1,
      'raise': 1,
      'break': 1,
      'continue': 1
    }

    this.checkOutdent = function (state, line, input) {
      if (input !== '\r\n' && input !== '\r' && input !== '\n') { return false }

      var tokens = this.getTokenizer().getLineTokens(line.trim(), state).tokens

      if (!tokens) {
        return false
      }
      do {
        var last = tokens.pop()
      } while (last && (last.type === 'comment' || (last.type === 'text' && last.value.match(/^\s+$/))))

      if (!last) { return false }

      return (last.type === 'keyword' && outdents[last.value])
    }

    this.autoOutdent = function (state, doc, row) {
      row += 1
      var indent = this.$getIndent(doc.getLine(row))
      var tab = doc.getTabString()
      if (indent.slice(-tab.length) === tab) { doc.remove(new Range(row, indent.length - tab.length, row, indent.length)) }
    }

    this.$id = 'ace/mode/songcheat'
  }).call(Mode.prototype)

  exports.Mode = Mode
})
