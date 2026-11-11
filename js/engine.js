(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TypingEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Turn curly quotes and dashes into the matching keyboard punctuation.
  function foldPunctuation(cp) {
    if (cp === 0x2018 || cp === 0x2019 || cp === 0x201A || cp === 0x201B) return 0x0027;
    if (cp === 0x201C || cp === 0x201D || cp === 0x201E || cp === 0x201F) return 0x0022;
    if (cp === 0x2013 || cp === 0x2014 || cp === 0x2212) return 0x002D;
    return cp;
  }

  // English A-Z/a-z, Russian Cyrillic, Hebrew letters, digits, space, and
  // keyboard punctuation. Capitals stay. Everything else is removed.
  function isAllowed(cp) {
    if (cp === 0x0020 || cp === 0x000A || cp === 0x000D) return true;
    if ((cp >= 0x0041 && cp <= 0x005A) || (cp >= 0x0061 && cp <= 0x007A)) return true;
    if (cp >= 0x0030 && cp <= 0x0039) return true;
    if (cp >= 0x05D0 && cp <= 0x05EA) return true;
    if (cp >= 0x0400 && cp <= 0x04FF) return true;
    if (cp === 0x05BE || cp === 0x05F3 || cp === 0x05F4) return true;
    return cp === 0x0021 || cp === 0x0022 || cp === 0x0027 ||
      cp === 0x0028 || cp === 0x0029 || cp === 0x002C ||
      cp === 0x002D || cp === 0x002E || cp === 0x002F ||
      cp === 0x003A || cp === 0x003B || cp === 0x003F;
  }

  // Unicode White_Space, plus U+FEFF which JavaScript trim treats as space.
  function isWhitespace(cp) {
    return cp === 0x0009 || cp === 0x000A || cp === 0x000B || cp === 0x000C ||
      cp === 0x000D || cp === 0x0020 || cp === 0x0085 || cp === 0x00A0 ||
      cp === 0x1680 || cp === 0x2028 || cp === 0x2029 || cp === 0x202F ||
      cp === 0x205F || cp === 0x3000 || cp === 0xFEFF ||
      (cp >= 0x2000 && cp <= 0x200A);
  }

  function isHebrewLetter(cp) {
    return cp >= 0x05D0 && cp <= 0x05EA;
  }

  // Strong scripts only. Digits, hyphen, comma, period, maqaf, and quotes are neutral.
  function strongScript(cp) {
    if (isHebrewLetter(cp)) return 'hebrew';
    if (cp >= 0x0400 && cp <= 0x04FF) return 'cyrillic';
    if ((cp >= 0x0041 && cp <= 0x005A) ||
        (cp >= 0x0061 && cp <= 0x007A) ||
        (cp >= 0x00C0 && cp <= 0x024F)) return 'latin';
    return null;
  }

  function cleanText(value) {
    if (typeof value !== 'string' || value.length === 0) return '';
    var text = value.normalize('NFC');
    var out = '';
    var i = 0;
    while (i < text.length) {
      var cp = foldPunctuation(text.codePointAt(i));
      var ch = String.fromCodePoint(cp);
      i += String.fromCodePoint(text.codePointAt(i)).length;
      if (isAllowed(cp)) out += ch;
    }
    return out;
  }

  function scalarValues(text) {
    var units = [];
    var i = 0;
    while (i < text.length) {
      var cp = text.codePointAt(i);
      var ch = String.fromCodePoint(cp);
      i += ch.length;
      units.push({ cp: cp, ch: ch });
    }
    return units;
  }

  function wordToken(chars) {
    var owned = chars.slice();
    var dir = 'ltr';
    var i;
    for (i = 0; i < owned.length; i++) {
      if (isHebrewLetter(owned[i].codePointAt(0))) {
        dir = 'rtl';
        break;
      }
    }
    return { type: 'word', dir: dir, chars: owned };
  }

  // Split one whitespace-delimited word where the strong script changes.
  // Neutrals stick to the current run. Leading neutrals stick to the first
  // strong run. A script change peels trailing neutrals onto the new run.
  // Callers must not insert a space token between these runs.
  function splitScriptRuns(chars) {
    var runs = [];
    var current = [];
    var script = null;
    var i;
    for (i = 0; i < chars.length; i++) {
      var ch = chars[i];
      var kind = strongScript(ch.codePointAt(0));
      if (kind === null || script === null || kind === script) {
        if (kind !== null) script = kind;
        current.push(ch);
        continue;
      }
      var peeled = [];
      while (current.length && strongScript(current[current.length - 1].codePointAt(0)) === null) {
        peeled.push(current.pop());
      }
      if (current.length) runs.push(current);
      peeled.reverse();
      peeled.push(ch);
      current = peeled;
      script = kind;
    }
    if (current.length) runs.push(current);
    return runs;
  }

  function buildTokens(rawText) {
    if (typeof rawText !== 'string' || rawText.length === 0) return [];

    var units = scalarValues(cleanText(rawText));
    var start = 0;
    var end = units.length;
    while (start < end && isWhitespace(units[start].cp)) start += 1;
    while (end > start && isWhitespace(units[end - 1].cp)) end -= 1;

    var words = [];
    var current = [];
    var i;
    for (i = start; i < end; i++) {
      if (isWhitespace(units[i].cp)) {
        if (current.length) {
          words.push(current);
          current = [];
        }
      } else {
        current.push(units[i].ch);
      }
    }
    if (current.length) words.push(current);

    var tokens = [];
    for (i = 0; i < words.length; i++) {
      if (i > 0) tokens.push({ type: 'space' });
      var runs = splitScriptRuns(words[i]);
      var r;
      for (r = 0; r < runs.length; r++) tokens.push(wordToken(runs[r]));
    }
    return tokens;
  }

  function createRun(rawText) {
    var cleaned = cleanText(rawText);
    var tokens = buildTokens(cleaned);
    return {
      rawText: cleaned,
      tokens: tokens,
      tokenIndex: 0,
      charIndex: 0,
      mistakes: 0,
      typed: 0,
      combo: 0,
      startedAt: null,
      finishedAt: null,
      status: tokens.length === 0 ? 'empty' : 'ready'
    };
  }

  // Character still required at the current cursor, or null when there is none.
  function currentExpected(run) {
    var token = run.tokens[run.tokenIndex];
    if (!token) return null;
    if (token.type === 'space') return ' ';
    if (run.charIndex < 0 || run.charIndex >= token.chars.length) return null;
    return token.chars[run.charIndex];
  }

  function ignoredResult() {
    return { ok: false, finished: false, expected: null, ignored: true };
  }

  // Move past a character that was just accepted.
  // Finished only when that character was the last one of the last word.
  function advance(run, now) {
    var token = run.tokens[run.tokenIndex];
    if (token.type === 'space') {
      run.tokenIndex += 1;
      run.charIndex = 0;
      return false;
    }

    run.charIndex += 1;
    var endOfWord = run.charIndex >= token.chars.length;
    if (!endOfWord) return false;

    var lastWord = run.tokenIndex >= run.tokens.length - 1;
    if (lastWord) {
      run.status = 'finished';
      run.finishedAt = now;
      return true;
    }

    run.tokenIndex += 1;
    run.charIndex = 0;
    return false;
  }

  function press(run, key) {
    if (typeof key !== 'string' || key.length !== 1) return ignoredResult();
    if (run.status === 'empty' || run.status === 'finished') return ignoredResult();

    var expected = currentExpected(run);
    if (expected === null) return ignoredResult();

    var now = Date.now();
    if (run.startedAt === null) {
      run.startedAt = now;
      run.status = 'playing';
    }

    if (key === expected) {
      run.typed += 1;
      run.combo += 1;
      var finished = advance(run, now);
      return {
        ok: true,
        finished: finished,
        expected: finished ? null : currentExpected(run),
        ignored: false
      };
    }

    run.mistakes += 1;
    run.combo = 0;
    return { ok: false, finished: false, expected: expected, ignored: false };
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function stats(run, now) {
    if (now === undefined) now = Date.now();
    var elapsedMs = 0;
    if (run.startedAt !== null) {
      var end = run.finishedAt !== null ? run.finishedAt : now;
      elapsedMs = end - run.startedAt;
    }
    var cpm = elapsedMs === 0 ? 0 : run.typed / (elapsedMs / 60000);
    var attempts = run.typed + run.mistakes;
    var accuracy = attempts === 0 ? 100 : (run.typed / attempts) * 100;
    return {
      elapsedMs: elapsedMs,
      cpm: round1(cpm),
      accuracy: round1(accuracy)
    };
  }

  function restart(run) {
    return createRun(run.rawText);
  }

  return { createRun: createRun, press: press, stats: stats, restart: restart, cleanText: cleanText };
});
