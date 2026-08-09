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

// Zvuky su skutocne nahravky (Mixkit Sound Effects Free License - viac v README), nie
// syntetizovane oscilatormi. Kazdy typ ma svoj mp3 v public/sounds/{typ}.mp3, ktory sa pri prvom
// pouziti stiahne a rozdekoduje raz a ulozi do pamate (dalsie prehratia su uz bez siete).
const SOUND_TYPES = [
  'rain', 'wind', 'thunder', 'duck', 'dog', 'cat', 'bird', 'train', 'water', 'fire',
  'bell', 'owl', 'horse', 'cow', 'sheep', 'clock', 'dragon', 'wolf', 'bear', 'frog',
  'mouse', 'rabbit', 'squirrel', 'magic', 'footsteps', 'laugh', 'splash', 'door',
];

// Niektore stiahnute klipy su dlhe ambientne slucky (desiatky sekund az minuty) - pocas citania
// ale sluzia len ako kratky "akcent" max. raz za 2-3 vety, preto prehravanie orezeme na tuto
// dlzku (s kratkym fade-outom, aby to neznelo strihnute) bez ohladu na skutocnu dlzku suboru.
const SOUND_MAX_DURATION = 3;
const SOUND_FADE_OUT = 0.4;
const SOUND_FADE_IN = 0.02;
const SOUND_VOLUME = 0.55;

const soundBufferCache = new Map(); // typ -> Promise<AudioBuffer|null>

function loadSoundBuffer(ctx, type) {
  if (!soundBufferCache.has(type)) {
    const promise = fetch(`sounds/${type}.mp3`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .catch((err) => {
        console.error(`Nepodarilo sa načítať zvukový efekt "${type}":`, err);
        soundBufferCache.delete(type);
        return null;
      });
    soundBufferCache.set(type, promise);
  }
  return soundBufferCache.get(type);
}

function playSoundEffect(type) {
  const ctx = getAudioContext();
  if (!ctx || !SOUND_TYPES.includes(type)) return;
  loadSoundBuffer(ctx, type).then((buffer) => {
    if (!buffer) return;
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      const playDuration = Math.min(buffer.duration, SOUND_MAX_DURATION);
      const t = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(SOUND_VOLUME, t + SOUND_FADE_IN);
      if (buffer.duration > playDuration) {
        gainNode.gain.setValueAtTime(SOUND_VOLUME, t + playDuration - SOUND_FADE_OUT);
        gainNode.gain.linearRampToValueAtTime(0, t + playDuration);
      }
      source.connect(gainNode).connect(ctx.destination);
      source.start(t, 0, playDuration);
    } catch (err) {
      console.error('Chyba pri prehrávaní zvukového efektu:', err);
    }
  });
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
