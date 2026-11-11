(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GameCopy = api;
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    startLabels: [
      'Let\'s rock',
      'Slow is allowed',
      'Start at the first letter',
      'First word, then the rest',
      'Read the line, then start',
      'Stay with the key you are on',
      'Match the ending to the start',
      'Fingers down, then go',
      'Begin without announcing it',
      'One passage, start to end',
      'Leave a clean line behind you',
      'This is only practice',
      'Fine. Impress me.',
      'Try not to miss the space bar.',
      'A wild guess is still a miss',
      'Rushing changes the wrong letters',
      'Looking down will not type it',
      'Three scripts, one pair of hands',
      'Some people collect restarts',
      'Commas count, unfortunately',
      'You can admire the score later',
      'Those are the words. Type them.',
      'Fast is a mood. The number comes later.',
      'This is the part where you type'
    ],
    finishLines: [
      'The line ended on the last key you pressed.',
      'That was a complete run, whatever the numbers say.',
      'The numbers are in, and they do not do small talk.',
      'The passage is finished, and it is unimpressed.',
      'You did not wander off in the middle.',
      'You may now stare at the score as if it owes you money.',
      'No character in that line is still waiting.',
      'Your hands can rest now that the paragraph is done.',
      'Restart is sitting there, looking innocent.',
      'Speed showed up with accuracy in tow.',
      'You finished, so try to act casual.',
      'A finished line was the job, and here it is.'
    ],
    sample: 'השארתי את keyboard על השולחן, ויצאתי לקנות לחם. ליד הדלת אמרתי привет לחתול, והוא לא זז. כשחזרתי, התה עדיין היה חם.',
    useSample: 'Use sample',
    restart: 'Restart',
    editText: 'Edit text',
    clearText: 'Clear text',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    dark: 'Dark',
    light: 'Light',
    space: 'space',
    empty: 'The empty box is not a passage.',
    scriptHebrew: 'Hebrew',
    scriptEnglish: 'English',
    scriptRussian: 'Russian',
    scriptSymbol: 'symbol',
    statSpeed: 'characters / min',
    statAccuracy: 'accuracy'
  };
});
