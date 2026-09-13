const pianoKeys = [
  { note: 'S', type: 'white', code: 'KeyS' },
  { note: 'E', type: 'black', code: 'KeyE' },
  { note: 'D', type: 'white', code: 'KeyD' },
  { note: 'R', type: 'black', code: 'KeyR' },
  { note: 'F', type: 'white', code: 'KeyF' },
  { note: 'G', type: 'white', code: 'KeyG' },
  { note: 'Y', type: 'black', code: 'KeyY' },
  { note: 'H', type: 'white', code: 'KeyH' },
  { note: 'U', type: 'black', code: 'KeyU' },
  { note: 'J', type: 'white', code: 'KeyJ' },
  { note: 'I', type: 'black', code: 'KeyI' },
  { note: 'K', type: 'white', code: 'KeyK' },
];

const createSounds = (keys) => {
  keys.forEach(key => {
    const audio = document.createElement('audio');
    audio.id = `note${key.note}`;
    audio.src = `assets/audio/${key.note}.mp3`;
    document.body.appendChild(audio);
  });
};

const createPiano = (keys) => {
  const pianoContainer = document.createElement('div');
  pianoContainer.className = 'piano';

  keys.forEach(key => {
    const button = document.createElement('button');
    button.className = `key key--${key.type}`;
    button.setAttribute('data-key', key.note);
    button.textContent = key.note;

    if (key.type === 'white' && key.note !== 'G') {
      button.style.marginLeft = '-30px';
    }

    pianoContainer.appendChild(button);
  });

  document.body.appendChild(pianoContainer);
};

const playSound = (note) => {
  const audio = document.getElementById(`note${note}`);
  audio.currentTime = 0;
  audio.play().catch(error => console.error('Ошибка воспроизведения:', error));
};

const handleKeyPress = (event) => {
  const keyPressed = pianoKeys.find(k => k.code === event.code);
  if (keyPressed) {
    playSound(keyPressed.note);
  }
};

const handleButtonClick = (event) => {
  const note = event.target.getAttribute('data-key');
  if (note) {
    playSound(note);
  }
};


createPiano(pianoKeys);
createSounds(pianoKeys);

document.addEventListener('keydown', handleKeyPress);
document.body.addEventListener('click', handleButtonClick);
