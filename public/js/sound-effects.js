let sfxAudioCtx = null;

function getAudioContext() {
  if (!sfxAudioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    sfxAudioCtx = new Ctx();
  }
  if (sfxAudioCtx.state === 'suspended') {
    sfxAudioCtx.resume();
  }
  return sfxAudioCtx;
}

function createNoiseBuffer(ctx, duration) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playFilteredNoise(ctx, { duration, filterType = 'lowpass', frequency = 1000, Q = 1, gain = 0.25, fadeIn = 0.05, fadeOut = 0.2, startTime = 0 }) {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = Q;
  const gainNode = ctx.createGain();
  const t = ctx.currentTime + startTime;
  const sustainEnd = Math.max(t, t + duration - fadeOut);
  gainNode.gain.setValueAtTime(0, t);
  gainNode.gain.linearRampToValueAtTime(gain, t + fadeIn);
  gainNode.gain.setValueAtTime(gain, sustainEnd);
  gainNode.gain.linearRampToValueAtTime(0, t + duration);
  source.connect(filter).connect(gainNode).connect(ctx.destination);
  source.start(t);
  source.stop(t + duration + 0.05);
}

function playTone(ctx, { freq = 440, freqEnd = null, type = 'sine', duration = 0.3, gain = 0.2, startTime = 0 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  const t = ctx.currentTime + startTime;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, t);
  gainNode.gain.linearRampToValueAtTime(gain, t + Math.min(0.05, duration / 4));
  gainNode.gain.setValueAtTime(gain, t + duration * 0.7);
  gainNode.gain.linearRampToValueAtTime(0, t + duration);
  osc.connect(gainNode).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

const SOUND_EFFECTS = {
  rain(ctx) {
    playFilteredNoise(ctx, { duration: 2.2, filterType: 'bandpass', frequency: 3500, Q: 0.6, gain: 0.16, fadeIn: 0.3, fadeOut: 0.5 });
    playFilteredNoise(ctx, { duration: 2.2, filterType: 'highpass', frequency: 5000, Q: 0.4, gain: 0.07, fadeIn: 0.3, fadeOut: 0.5 });
  },
  wind(ctx) {
    playFilteredNoise(ctx, { duration: 2.5, filterType: 'lowpass', frequency: 500, Q: 0.7, gain: 0.2, fadeIn: 0.4, fadeOut: 0.6 });
  },
  thunder(ctx) {
    playFilteredNoise(ctx, { duration: 0.15, filterType: 'highpass', frequency: 2000, gain: 0.3, fadeIn: 0.01, fadeOut: 0.05 });
    playFilteredNoise(ctx, { duration: 2.0, filterType: 'lowpass', frequency: 200, Q: 0.5, gain: 0.32, fadeIn: 0.05, fadeOut: 1.0, startTime: 0.1 });
  },
  duck(ctx) {
    [0, 0.35, 0.7].forEach((startTime) => {
      playTone(ctx, { freq: 500, freqEnd: 300, type: 'sawtooth', duration: 0.22, gain: 0.2, startTime });
    });
  },
  dog(ctx) {
    [0, 0.3].forEach((startTime) => {
      playFilteredNoise(ctx, { duration: 0.15, filterType: 'bandpass', frequency: 400, Q: 2, gain: 0.32, fadeIn: 0.01, fadeOut: 0.05, startTime });
    });
  },
  cat(ctx) {
    playTone(ctx, { freq: 400, freqEnd: 650, type: 'triangle', duration: 0.35, gain: 0.18, startTime: 0 });
    playTone(ctx, { freq: 650, freqEnd: 350, type: 'triangle', duration: 0.35, gain: 0.18, startTime: 0.35 });
  },
  bird(ctx) {
    [0, 0.25, 0.5].forEach((startTime, i) => {
      playTone(ctx, { freq: 2800 + i * 200, freqEnd: 3400, type: 'sine', duration: 0.12, gain: 0.13, startTime });
    });
  },
  train(ctx) {
    for (let i = 0; i < 6; i++) {
      playFilteredNoise(ctx, { duration: 0.12, filterType: 'lowpass', frequency: 300, gain: 0.22, fadeIn: 0.01, fadeOut: 0.05, startTime: i * 0.28 });
    }
    playTone(ctx, { freq: 300, freqEnd: 260, type: 'sawtooth', duration: 1.2, gain: 0.1, startTime: 0.2 });
  },
  water(ctx) {
    playFilteredNoise(ctx, { duration: 2.3, filterType: 'bandpass', frequency: 1800, Q: 0.5, gain: 0.15, fadeIn: 0.3, fadeOut: 0.5 });
  },
  fire(ctx) {
    for (let i = 0; i < 14; i++) {
      const startTime = Math.random() * 2;
      playFilteredNoise(ctx, { duration: 0.05 + Math.random() * 0.05, filterType: 'highpass', frequency: 1500, gain: 0.12, fadeIn: 0.005, fadeOut: 0.03, startTime });
    }
  },
  bell(ctx) {
    [1, 2, 3].forEach((mult) => {
      playTone(ctx, { freq: 800 * mult, type: 'sine', duration: 1.2, gain: 0.15 / mult, startTime: 0 });
    });
  },
  owl(ctx) {
    playTone(ctx, { freq: 300, freqEnd: 250, type: 'sine', duration: 0.5, gain: 0.2, startTime: 0 });
    playTone(ctx, { freq: 300, freqEnd: 250, type: 'sine', duration: 0.5, gain: 0.2, startTime: 0.7 });
  },
  horse(ctx) {
    [0, 0.25, 0.5, 0.75].forEach((startTime) => {
      playFilteredNoise(ctx, { duration: 0.1, filterType: 'lowpass', frequency: 250, gain: 0.28, fadeIn: 0.005, fadeOut: 0.04, startTime });
    });
  },
  cow(ctx) {
    playTone(ctx, { freq: 150, freqEnd: 200, type: 'sawtooth', duration: 1.0, gain: 0.2, startTime: 0 });
  },
  sheep(ctx) {
    playTone(ctx, { freq: 400, freqEnd: 300, type: 'sawtooth', duration: 0.5, gain: 0.18, startTime: 0 });
  },
  clock(ctx) {
    [0, 1, 2].forEach((startTime) => {
      playFilteredNoise(ctx, { duration: 0.04, filterType: 'highpass', frequency: 3000, gain: 0.2, fadeIn: 0.002, fadeOut: 0.02, startTime });
    });
  },
  dragon(ctx) {
    playTone(ctx, { freq: 90, freqEnd: 60, type: 'sawtooth', duration: 1.0, gain: 0.2, startTime: 0 });
    playFilteredNoise(ctx, { duration: 1.0, filterType: 'lowpass', frequency: 300, Q: 1, gain: 0.18, fadeIn: 0.05, fadeOut: 0.3, startTime: 0 });
  },
  wolf(ctx) {
    playTone(ctx, { freq: 300, freqEnd: 550, type: 'sine', duration: 1.0, gain: 0.18, startTime: 0 });
  },
  bear(ctx) {
    playFilteredNoise(ctx, { duration: 0.8, filterType: 'lowpass', frequency: 220, Q: 0.8, gain: 0.26, fadeIn: 0.1, fadeOut: 0.3 });
    playTone(ctx, { freq: 100, freqEnd: 80, type: 'sawtooth', duration: 0.8, gain: 0.14, startTime: 0 });
  },
  frog(ctx) {
    playTone(ctx, { freq: 250, freqEnd: 180, type: 'square', duration: 0.15, gain: 0.18, startTime: 0 });
    playTone(ctx, { freq: 300, freqEnd: 200, type: 'square', duration: 0.12, gain: 0.16, startTime: 0.18 });
  },
  mouse(ctx) {
    [0, 0.15].forEach((startTime) => {
      playTone(ctx, { freq: 3200, freqEnd: 3800, type: 'sine', duration: 0.08, gain: 0.11, startTime });
    });
  },
  rabbit(ctx) {
    playFilteredNoise(ctx, { duration: 0.12, filterType: 'lowpass', frequency: 300, gain: 0.2, fadeIn: 0.01, fadeOut: 0.05 });
  },
  squirrel(ctx) {
    for (let i = 0; i < 5; i++) {
      playTone(ctx, { freq: 2000 + Math.random() * 500, type: 'square', duration: 0.05, gain: 0.09, startTime: i * 0.09 });
    }
  },
  magic(ctx) {
    [0, 1, 2, 3, 4].forEach((i) => {
      playTone(ctx, { freq: 600 * Math.pow(1.26, i), type: 'sine', duration: 0.3, gain: 0.11, startTime: i * 0.08 });
    });
  },
  footsteps(ctx) {
    [0, 0.4, 0.8, 1.2].forEach((startTime) => {
      playFilteredNoise(ctx, { duration: 0.1, filterType: 'lowpass', frequency: 200, gain: 0.18, fadeIn: 0.01, fadeOut: 0.05, startTime });
    });
  },
  laugh(ctx) {
    [0, 0.2, 0.4].forEach((startTime, i) => {
      playTone(ctx, { freq: 500 + i * 80, freqEnd: 650 + i * 80, type: 'triangle', duration: 0.15, gain: 0.14, startTime });
    });
  },
  splash(ctx) {
    playFilteredNoise(ctx, { duration: 0.35, filterType: 'bandpass', frequency: 1200, Q: 0.8, gain: 0.26, fadeIn: 0.01, fadeOut: 0.2 });
  },
  door(ctx) {
    playTone(ctx, { freq: 300, freqEnd: 220, type: 'sawtooth', duration: 0.6, gain: 0.14, startTime: 0 });
  },
};

const SOUND_TYPES = Object.keys(SOUND_EFFECTS);

function playSoundEffect(type) {
  const ctx = getAudioContext();
  if (!ctx || !SOUND_EFFECTS[type]) return;
  try {
    SOUND_EFFECTS[type](ctx);
  } catch (err) {
    console.error('Chyba pri prehrávaní zvukového efektu:', err);
  }
}

const SOUND_KEYWORDS = {
  sk: {
    rain: ['dážď', 'dazd', 'daždík', 'dazdik', 'prší', 'prsi', 'pršalo', 'prsalo', 'dažďom', 'dazdom', 'daždi'],
    wind: ['vietor', 'veternom', 'vetríkom', 'vetrikom', 'vánok', 'vanok', 'vetra'],
    thunder: ['hrom', 'hromy', 'búrka', 'burka', 'blesk', 'blesky'],
    duck: ['kačka', 'kacka', 'kačku', 'kacku', 'kačky', 'kacky', 'kačke', 'kacke', 'kačička', 'kacicka', 'kačičku', 'kacicku', 'kačica', 'kacica', 'kačiatko', 'kaciatko'],
    dog: ['pes', 'psa', 'psovi', 'psom', 'psík', 'psik', 'psíka', 'psika', 'psíček', 'psicek', 'šteniatko', 'stenatko', 'brechal', 'brechala', 'brechot'],
    cat: ['mačka', 'macka', 'mačku', 'macku', 'mačky', 'macky', 'mačke', 'macke', 'mačička', 'macicka', 'mačiatko', 'maciatko', 'mňaukala', 'mnaukala'],
    bird: ['vták', 'vtak', 'vtáka', 'vtaka', 'vtákovi', 'vtakovi', 'vtáčik', 'vtacik', 'vtáčika', 'vtacika', 'vtáčatko', 'vtacatko', 'vtáčence', 'vtacence'],
    train: ['vlak', 'vlaku', 'vlakom', 'vláčik', 'vlacik', 'vláčika', 'vlacika', 'vláčikom', 'vlacikom'],
    water: ['potok', 'potôčik', 'potocik', 'rieka', 'riečka', 'riecka', 'more', 'vlny', 'vlnky'],
    fire: ['oheň', 'ohen', 'plameň', 'plamen', 'ohník', 'ohnik', 'ohnisko', 'ohníkom', 'ohnikom'],
    bell: ['zvon', 'zvonček', 'zvoncek', 'zvonil', 'zvonili', 'zvonenie'],
    owl: ['sova', 'sovička', 'sovicka'],
    horse: ['kôň', 'kon', 'koník', 'konik', 'koníkom', 'konikom'],
    cow: ['krava', 'kravička', 'kravicka'],
    sheep: ['ovca', 'ovečka', 'ovecka', 'ovečky', 'ovecky'],
    clock: ['hodiny', 'hodinky', 'tikanie', 'tikali', 'tikot'],
    dragon: ['drak', 'draka', 'drakovi', 'drakom', 'dráčik', 'dracik'],
    wolf: ['vlk', 'vlka', 'vlkovi', 'vlkom'],
    bear: ['medveď', 'medved', 'medveďa', 'medveda', 'medvedík', 'medvedik', 'macko', 'mackovi'],
    frog: ['žaba', 'zaba', 'žabku', 'zabku', 'žabka', 'zabka'],
    mouse: ['myš', 'mys', 'myšku', 'mysku', 'myška', 'myska'],
    rabbit: ['zajac', 'zajaca', 'zajko', 'zajka', 'králik', 'kralik', 'králika', 'kralika'],
    squirrel: ['veverička', 'vevericka', 'veveričku', 'vevericku', 'veveričke', 'vevericke'],
    magic: ['mágia', 'magia', 'čaro', 'caro', 'kúzlo', 'kuzlo', 'kúzlom', 'kuzlom', 'čarovné', 'carovne'],
    footsteps: ['kroky', 'krokov', 'kráčal', 'kracal', 'kráčala', 'kracala', 'kráčali', 'kracali'],
    laugh: ['smiech', 'smial', 'smiala', 'zasmial', 'zasmiala', 'smiali'],
    splash: ['šplech', 'splech', 'čľapkal', 'clapkal', 'čľapkala', 'clapkala'],
    door: ['dvere', 'dverami', 'dverí', 'dveri'],
  },
  en: {
    rain: ['rain', 'rains', 'raining', 'raindrop', 'raindrops', 'rainy'],
    wind: ['wind', 'winds', 'windy', 'breeze'],
    thunder: ['thunder', 'storm', 'lightning'],
    duck: ['duck', 'ducks', 'duckling', 'ducklings'],
    dog: ['dog', 'dogs', 'puppy', 'puppies', 'bark', 'barked'],
    cat: ['cat', 'cats', 'kitten', 'kittens', 'meow', 'meowed'],
    bird: ['bird', 'birds', 'chirp', 'chirped', 'chirping'],
    train: ['train', 'trains'],
    water: ['stream', 'river', 'ocean', 'waves', 'brook'],
    fire: ['fire', 'flame', 'flames', 'campfire'],
    bell: ['bell', 'bells'],
    owl: ['owl', 'owls'],
    horse: ['horse', 'horses', 'pony', 'ponies'],
    cow: ['cow', 'cows'],
    sheep: ['sheep', 'lamb', 'lambs'],
    clock: ['clock', 'clocks', 'ticking', 'tick'],
    dragon: ['dragon', 'dragons'],
    wolf: ['wolf', 'wolves'],
    bear: ['bear', 'bears'],
    frog: ['frog', 'frogs'],
    mouse: ['mouse', 'mice'],
    rabbit: ['rabbit', 'rabbits', 'bunny', 'bunnies'],
    squirrel: ['squirrel', 'squirrels'],
    magic: ['magic', 'magical', 'sparkle', 'sparkles'],
    footsteps: ['footsteps', 'steps'],
    laugh: ['laugh', 'laughed', 'giggle', 'giggled'],
    splash: ['splash', 'splashed'],
    door: ['door', 'doors', 'creak', 'creaked'],
  },
};

function buildSoundMap(language) {
  const dict = SOUND_KEYWORDS[language] || SOUND_KEYWORDS.sk;
  const map = new Map();
  Object.entries(dict).forEach(([soundType, words]) => {
    words.forEach((w) => map.set(w.toLowerCase(), soundType));
  });
  return map;
}

const soundMapCache = {};

function normalizeWord(word) {
  return word.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
}

function matchSoundForWord(word, language) {
  const lang = language === 'en' ? 'en' : 'sk';
  if (!soundMapCache[lang]) soundMapCache[lang] = buildSoundMap(lang);
  return soundMapCache[lang].get(normalizeWord(word)) || null;
}
