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

let activePlaying = null;
let editingNote = null;
let editPanel = null;
let editInput = null;
let errorMessage = null;
let isAutoPlaying = false;

const DELAY = 300;
const AUDIO_END_TIMEOUT = 1000;

const CYR_TO_LAT = {
  'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
  'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': '\'',
  'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.', 'ё': '`'
};

const normalizeToUpperLatin = (char) => {
  if (!char || char.length !== 1) return null;
  const lower = char.toLowerCase();
  const mapped = CYR_TO_LAT[lower] || lower;
  if (mapped >= 'a' && mapped <= 'z') return mapped.toUpperCase();
  return null;
};

const normalizePreserveCase = (char) => {
  if (!char || char.length !== 1) return null;
  const isUpper = char === char.toUpperCase();
  const lower = char.toLowerCase();
  const mappedLower = CYR_TO_LAT[lower] || lower;
  if (mappedLower < 'a' || mappedLower > 'z') return null;
  return isUpper ? mappedLower.toUpperCase() : mappedLower;
};

const getLabelToNoteMap = () => {
  const map = new Map();
  document.querySelectorAll('.key').forEach((btn) => {
    const label = (btn.textContent || '').trim();
    const note = btn.getAttribute('data-key');
    if (!label || !note) return;
    map.set(label.toUpperCase(), note);
  });
  return map;
};

const stopAllSoundsAndDeactivate = () => {
  pianoKeys.forEach(k => {
    const a = document.getElementById(`note${k.note}`);
    if (a) {
      try { a.pause(); } catch (_) { }
      a.currentTime = 0;
    }
    setActiveVisual(k.note, false);
  });
};

const waitMs = (ms) => new Promise(res => setTimeout(res, ms));

const playNoteOnce = async (note) => {
  const audio = document.getElementById(`note${note}`);
  if (!audio) {
    await waitMs(DELAY);
    return;
  }
  try { audio.pause(); } catch (_) { }
  audio.currentTime = 0;
  try { await audio.play(); } catch (_) { }

  await new Promise((resolve) => {
    let resolved = false;
    const onEnded = () => {
      if (resolved) return;
      resolved = true;
      audio.removeEventListener('ended', onEnded);
      resolve();
    };
    audio.addEventListener('ended', onEnded, { once: true });
    setTimeout(() => {
      if (resolved) return;
      audio.removeEventListener('ended', onEnded);
      resolved = true;
      resolve();
    }, AUDIO_END_TIMEOUT);
  });
};

const createTitle = () => {
  const h1 = document.createElement('h1');
  h1.textContent = 'Virtual Music Kit';
  document.body.appendChild(h1);
}

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
    const keyContainer = document.createElement('div');
    keyContainer.className = `key-container key-container--${key.type}`;
    const button = document.createElement('button');
    button.className = `key key--${key.type}`;
    button.setAttribute('data-key', key.note);
    button.setAttribute('data-code', key.code);
    button.textContent = key.note;

    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.setAttribute('type', 'button');
    editButton.setAttribute('aria-label', `Edit ${key.note}`);
    editButton.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditFor(key.note);
    });
    keyContainer.appendChild(editButton);

    if (key.type === 'white' && key.note !== 'G') {
      button.classList.add('key--left-margin');
    }

    keyContainer.appendChild(button);
    pianoContainer.appendChild(keyContainer);
  });

  document.body.appendChild(pianoContainer);
};

const createSequenceInput = (keys) => {
  const sequenceWrapper = document.createElement('div');
  sequenceWrapper.className = 'sequence-wrapper';

  const sequenceLabel = document.createElement('label');
  sequenceLabel.className = 'sequence-label';
  sequenceLabel.textContent = 'Type a sequence using existing notes';
  sequenceWrapper.appendChild(sequenceLabel);
  
  const sequenceInput = document.createElement('input');
  sequenceInput.type = 'text';
  sequenceInput.className = 'sequence-input';
  sequenceInput.placeholder = 'e.g., SDFG';
  sequenceInput.maxLength = pianoKeys.length * 2;

  const getLabelToNoteMap = () => {
    const map = new Map();
    document.querySelectorAll('.key').forEach((btn) => {
      const label = (btn.textContent || '').trim();
      const note = btn.getAttribute('data-key');
      if (!label || !note) return;
      map.set(label.toUpperCase(), note);
    });
    return map;
  };

  const normalizeLetterPreserveCase = (char) => normalizePreserveCase(char);

  sequenceInput.addEventListener('input', (e) => {
    const raw = String(e.target.value || '');
    const filtered = [];
    const labelToNote = getLabelToNoteMap();
    for (const ch of raw) {
      const letter = normalizeLetterPreserveCase(ch);
      if (!letter) continue;
      if (labelToNote.has(letter.toUpperCase())) {
        filtered.push(letter);
      }
      if (filtered.length >= sequenceInput.maxLength) break;
    }
    sequenceInput.value = filtered.join('');
  });

  const playButton = document.createElement('button');
  playButton.className = 'play-button';
  playButton.textContent = 'Play';

  sequenceWrapper.appendChild(sequenceInput);
  sequenceWrapper.appendChild(playButton);
  document.body.appendChild(sequenceWrapper);

  const letterToNote = (ch) => {
    const up = ch.toUpperCase();
    const labelToNote = getLabelToNoteMap();
    return labelToNote.get(up) || null;
  };

  const playSequence = async () => {
    if (isAutoPlaying) return;
    const raw = String(sequenceInput.value || '');
    const sequence = [];
    for (const ch of raw) {
      const note = letterToNote(ch);
      if (note) sequence.push(note);
    }
    if (sequence.length === 0) return;

    isAutoPlaying = true;
    sequenceInput.disabled = true;
    playButton.disabled = true;
    sequenceInput.classList.add('is-disabled');
    playButton.classList.add('is-disabled');
    
    const keyButtons = Array.from(document.querySelectorAll('.key'));
    const editButtons = Array.from(document.querySelectorAll('.edit-button'));
    editButtons.forEach((btn) => {
      btn.disabled = true;
      btn.classList.add('is-disabled');
    });

    keyButtons.forEach((btn) => {
      btn.classList.add('is-disabled');
    })

    stopAllSoundsAndDeactivate();

    for (const note of sequence) {
      if (!isAutoPlaying) break;
      setActiveVisual(note, true);
      await playNoteOnce(note);
      setActiveVisual(note, false);
      await waitMs(DELAY);
    }

    stopAllSoundsAndDeactivate();
    isAutoPlaying = false;
    sequenceInput.disabled = false;
    playButton.disabled = false;
    sequenceInput.classList.remove('is-disabled');
    playButton.classList.remove('is-disabled');
    const editButtonsRestore = Array.from(document.querySelectorAll('.edit-button'));
    editButtonsRestore.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove('is-disabled');
    });
    const keyButtonsRestore = Array.from(document.querySelectorAll('.key'));
    keyButtonsRestore.forEach((btn) => {
      btn.classList.remove('is-disabled');
    })

  };

  playButton.addEventListener('click', (e) => {
    e.preventDefault();
    playSequence();
  });
}

const ensureEditUI = () => {
  if (editPanel) return;
  editPanel = document.createElement('div');
  editPanel.className = 'edit-panel';

  const label = document.createElement('div');
  label.className = 'edit-panel__label';
  label.textContent = 'Type a new key and press Enter to confirm';

  editInput = document.createElement('input');
  editInput.className = 'edit-panel__input';
  editInput.type = 'text';
  editInput.maxLength = 1;
  editInput.placeholder = 'Please enter a letter A-Z';

  errorMessage = document.createElement('p');
  errorMessage.className = 'error-message';

  editPanel.appendChild(label);
  editPanel.appendChild(editInput);
  editPanel.appendChild(errorMessage);
  document.body.appendChild(editPanel);

  const closeWithoutSave = () => {
    editingNote = null;
    editPanel.classList.remove('is-visible');
    editInput.value = '';
    errorMessage.textContent = '';
  };

  const normalizeToLatinLetter = (char) => normalizeToUpperLatin(char);

  editInput.addEventListener('keydown', (event) => {
    if (!editingNote) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeWithoutSave();
      return;
    }
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const raw = editInput.value.trim();
    const upperLetter = normalizeToLatinLetter(raw);
    if (!upperLetter) {
      editInput.classList.add('is-error');
      errorMessage.textContent = "Please enter a valid English letter (A-Z).";
      return;
    }

    const proposedCode = `Key${upperLetter}`;

    const isTaken = pianoKeys.some(k => k.code === proposedCode && k.note !== editingNote);
    if (isTaken) {
      editInput.classList.add('is-error');
      errorMessage.textContent = `The key "${upperLetter}" is already assigned to another piano key. Please choose a different letter.`;
      return;
    }

    const entry = pianoKeys.find(k => k.note === editingNote);
    if (!entry) return;
    entry.code = proposedCode;

    const button = document.querySelector(`.key[data-key="${editingNote}"]`);
    if (button) {
      button.textContent = upperLetter;
      button.setAttribute('data-code', proposedCode);
    }

    closeWithoutSave();
  });

  editInput.addEventListener('input', () => {
    const raw = editInput.value.trim();
    const letter = normalizeToLatinLetter(raw);
    if (letter) {
      editInput.value = letter;
      editInput.classList.remove('is-error');
      errorMessage.textContent = '';
    } else {
      editInput.value = '';
    }
  });

  editInput.addEventListener('blur', () => {
    if (!editingNote) return;
    editingNote = null;
    editPanel.classList.remove('is-visible');
    editInput.value = '';
    editInput.classList.remove('is-error');
    errorMessage.textContent = '';
  });
};

const openEditFor = (note) => {
  if (isAutoPlaying) return;
  ensureEditUI();
  editingNote = note;
  const entry = pianoKeys.find(k => k.note === note);
  const currentDisplay = entry ? (entry.code.startsWith('Key') ? entry.code.slice(3) : entry.code) : '';
  editInput.value = currentDisplay;
  editInput.classList.remove('is-error');
  errorMessage.textContent = '';
  editPanel.classList.add('is-visible');
  editInput.focus();
  editInput.select();
};

const playSound = (note) => {
  const audio = document.getElementById(`note${note}`);
  audio.currentTime = 0;
  audio.play().catch(error => console.error('Ошибка воспроизведения:', error));
};

const setActiveVisual = (note, isActive) => {
  const button = document.querySelector(`.key[data-key="${note}"]`);
  if (button) {
    if (isActive) {
      button.classList.add('key--active');
    } else {
      button.classList.remove('key--active');
    }
  }
};

const handleKeyDown = (event) => {
  if (isAutoPlaying) return;
  if (event.repeat) return;

  if (activePlaying) return;

  const keyPressed = pianoKeys.find(k => k.code === event.code);
  if (!keyPressed) return;

  activePlaying = { type: 'keyboard', code: event.code, note: keyPressed.note };
  playSound(keyPressed.note);
  setActiveVisual(keyPressed.note, true);
};

const handleKeyUp = (event) => {
  if (!activePlaying || activePlaying.type !== 'keyboard') return;
  if (activePlaying.code !== event.code) return;

  setActiveVisual(activePlaying.note, false);
  activePlaying = null;
};

const handleMouseDown = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (isAutoPlaying) return;
  if (!target.classList.contains('key')) return;

  if (activePlaying) return;

  const note = target.getAttribute('data-key');
  if (!note) return;

  activePlaying = { type: 'mouse', note };
  playSound(note);
  setActiveVisual(note, true);
};

const endMouseActive = () => {
  if (!activePlaying || activePlaying.type !== 'mouse') return;
  setActiveVisual(activePlaying.note, false);
  activePlaying = null;
};

createTitle();
createPiano(pianoKeys);
createSounds(pianoKeys);
createSequenceInput(pianoKeys);

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

document.body.addEventListener('mousedown', handleMouseDown);

document.addEventListener('mouseup', endMouseActive);
document.addEventListener('mouseleave', endMouseActive);
