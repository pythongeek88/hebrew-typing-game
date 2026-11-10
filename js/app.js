(function () {
  'use strict';

  var copy = window.GameCopy;
  var engine = window.TypingEngine;
  var THEME_KEY = 'hebrew-typing-theme';
  var COMBO_AT = 8;

  var html = document.documentElement;
  var setup = document.getElementById('screen-setup');
  var play = document.getElementById('screen-play');
  var finish = document.getElementById('screen-finish');
  var passage = document.getElementById('passage');
  var emptyNote = document.getElementById('empty-note');
  var startBtn = document.getElementById('start');
  var strip = document.getElementById('passage-strip');
  var scriptTag = document.getElementById('script-tag');
  var stageWord = document.getElementById('stage-word');
  var spaceStep = document.getElementById('space-step');
  var spacebar = spaceStep.querySelector('.spacebar');
  var statCpm = document.getElementById('stat-cpm');
  var statAccuracy = document.getElementById('stat-accuracy');
  var finishLine = document.getElementById('finish-line');
  var finishStats = document.getElementById('finish-stats');
  var soundBtn = document.getElementById('sound-toggle');
  var themeSwitch = document.getElementById('theme-switch');

  var run = null;
  var source = '';
  var soundOn = true;
  var audioCtx = null;
  var statTimer = 0;
  var errorTimer = 0;

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function applyTheme(theme) {
    var next = theme === 'light' ? 'light' : 'dark';
    html.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (err) {
      /* private mode */
    }
  }

  function loadTheme() {
    var stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch (err) {
      stored = null;
    }
    applyTheme(stored === 'light' ? 'light' : 'dark');
  }

  function show(screen) {
    setup.hidden = screen !== setup;
    play.hidden = screen !== play;
    finish.hidden = screen !== finish;
    if (screen === setup) {
      startBtn.textContent = pick(copy.startLabels);
      passage.focus();
    }
    if (screen === play) play.focus();
  }

  function scriptLabel(ch) {
    var cp = ch.codePointAt(0);
    if (cp >= 0x05D0 && cp <= 0x05EA) return copy.scriptHebrew;
    if (cp >= 0x0400 && cp <= 0x04FF) return copy.scriptRussian;
    if ((cp >= 0x41 && cp <= 0x5A) || (cp >= 0x61 && cp <= 0x7A) || (cp >= 0xC0 && cp <= 0x24F)) {
      return copy.scriptEnglish;
    }
    return copy.scriptSymbol;
  }

  function fillLetters(chars, doneCount) {
    stageWord.replaceChildren();
    chars.forEach(function (ch, index) {
      var span = document.createElement('span');
      span.className = 'letter';
      span.textContent = ch;
      if (index < doneCount) span.classList.add('is-done');
      else if (index === doneCount) span.classList.add('is-next');
      else span.classList.add('is-ahead');
      stageWord.appendChild(span);
    });
  }

  function renderStrip() {
    strip.replaceChildren();
    var i = 0;
    while (i < run.tokens.length) {
      var token = run.tokens[i];
      if (token.type === 'space') {
        var gap = document.createElement('span');
        gap.className = 'strip-space';
        if (i === run.tokenIndex) gap.classList.add('is-next');
        strip.appendChild(gap);
        i += 1;
        continue;
      }
      var group = document.createElement('span');
      group.className = 'strip-group';
      while (i < run.tokens.length && run.tokens[i].type === 'word') {
        var word = run.tokens[i];
        var el = document.createElement('span');
        el.className = 'strip-word';
        el.dir = word.dir;
        el.textContent = word.chars.join('');
        if (i < run.tokenIndex) el.classList.add('is-done');
        else if (i === run.tokenIndex) el.classList.add('is-current');
        group.appendChild(el);
        i += 1;
      }
      strip.appendChild(group);
    }
  }

  function renderStage() {
    var token = run.tokens[run.tokenIndex];
    var onSpace = token && token.type === 'space';
    spaceStep.hidden = !onSpace;
    scriptTag.hidden = !token || onSpace;
    if (!token) return;
    if (onSpace) {
      var prev = run.tokens[run.tokenIndex - 1];
      stageWord.dir = prev.dir;
      stageWord.classList.add('is-settled');
      fillLetters(prev.chars, prev.chars.length);
      return;
    }
    stageWord.dir = token.dir;
    stageWord.classList.remove('is-settled');
    fillLetters(token.chars, run.charIndex);
    var nextChar = token.chars[run.charIndex];
    if (!nextChar) {
      scriptTag.hidden = true;
      return;
    }
    scriptTag.hidden = false;
    scriptTag.textContent = scriptLabel(nextChar);
  }

  function paintStats() {
    if (!run) return;
    var stats = engine.stats(run);
    var cpm = stats.elapsedMs < 400 ? 0 : stats.cpm;
    statCpm.textContent = cpm + ' ' + copy.statSpeed;
    statAccuracy.textContent = stats.accuracy + '% ' + copy.statAccuracy;
  }

  function formatTime(ms) {
    var total = Math.max(0, ms) / 1000;
    if (total < 60) return total.toFixed(1) + 's';
    var minutes = Math.floor(total / 60);
    var seconds = Math.floor(total % 60);
    return minutes + ':' + String(seconds).padStart(2, '0');
  }

  function stopStats() {
    window.clearInterval(statTimer);
    statTimer = 0;
  }

  function startStats() {
    stopStats();
    paintStats();
    statTimer = window.setInterval(paintStats, 200);
  }

  function renderPlay() {
    renderStrip();
    renderStage();
    play.classList.toggle('is-combo', run.combo >= COMBO_AT);
    paintStats();
  }

  function flashError() {
    play.classList.remove('is-error');
    void play.offsetWidth;
    play.classList.add('is-error');
    window.clearTimeout(errorTimer);
    errorTimer = window.setTimeout(function () {
      play.classList.remove('is-error');
    }, 520);
  }

  function tone(ok) {
    if (!soundOn) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = ok ? 'triangle' : 'sawtooth';
    osc.frequency.value = ok ? 680 : 150;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(ok ? 0.04 : 0.03, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (ok ? 0.07 : 0.12));
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  function showFinish() {
    stopStats();
    var stats = engine.stats(run);
    finishLine.textContent = pick(copy.finishLines);
    finishStats.replaceChildren();
    [
      [formatTime(stats.elapsedMs), 'time'],
      [String(stats.cpm), copy.statSpeed],
      [stats.accuracy + '%', copy.statAccuracy]
    ].forEach(function (pair) {
      var item = document.createElement('span');
      item.append(document.createTextNode(pair[0]));
      var label = document.createElement('small');
      label.textContent = pair[1];
      item.appendChild(label);
      finishStats.appendChild(item);
    });
    finish.classList.add('is-burst');
    show(finish);
  }

  function begin(text) {
    source = text;
    run = engine.createRun(text);
    if (run.status === 'empty') {
      emptyNote.hidden = false;
      emptyNote.textContent = copy.empty;
      startBtn.classList.remove('is-shake');
      void startBtn.offsetWidth;
      startBtn.classList.add('is-shake');
      return;
    }
    emptyNote.hidden = true;
    play.classList.remove('is-error', 'is-combo');
    finish.classList.remove('is-burst');
    show(play);
    renderPlay();
    startStats();
  }

  function restartRun() {
    if (!source) return;
    run = engine.restart(run || engine.createRun(source));
    play.classList.remove('is-error', 'is-combo');
    finish.classList.remove('is-burst');
    show(play);
    renderPlay();
    startStats();
  }

  document.getElementById('use-sample').textContent = copy.useSample;
  document.getElementById('restart-play').textContent = copy.restart;
  document.getElementById('restart-finish').textContent = copy.restart;
  document.getElementById('edit-text').textContent = copy.editText;
  soundBtn.textContent = copy.soundOn;
  themeSwitch.querySelector('[data-theme-option="dark"]').textContent = copy.dark;
  themeSwitch.querySelector('[data-theme-option="light"]').textContent = copy.light;
  spacebar.textContent = copy.space;
  passage.placeholder = copy.sample;

  loadTheme();
  show(setup);

  document.getElementById('use-sample').addEventListener('click', function () {
    passage.value = copy.sample;
    emptyNote.hidden = true;
    passage.focus();
  });

  passage.addEventListener('input', function () {
    if (passage.value.trim()) emptyNote.hidden = true;
  });

  startBtn.addEventListener('click', function () {
    begin(passage.value);
  });

  startBtn.addEventListener('animationend', function () {
    startBtn.classList.remove('is-shake');
  });

  document.getElementById('restart-play').addEventListener('click', restartRun);
  document.getElementById('restart-finish').addEventListener('click', restartRun);

  document.getElementById('edit-text').addEventListener('click', function () {
    stopStats();
    finish.classList.remove('is-burst');
    show(setup);
  });

  play.addEventListener('click', function (event) {
    if (event.target.closest('button')) return;
    play.focus();
  });

  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? copy.soundOn : copy.soundOff;
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  });

  themeSwitch.addEventListener('click', function (event) {
    var option = event.target.closest('[data-theme-option]');
    var next = option
      ? option.getAttribute('data-theme-option')
      : (html.dataset.theme === 'dark' ? 'light' : 'dark');
    applyTheme(next);
  });

  window.addEventListener('keydown', function (event) {
    if (play.hidden || !run) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (typeof event.key !== 'string' || event.key.length !== 1) return;
    event.preventDefault();
    var result = engine.press(run, event.key);
    if (result.ignored) return;
    if (result.ok) tone(true);
    else {
      tone(false);
      flashError();
    }
    renderPlay();
    if (result.finished) showFinish();
  }, true);
})();
