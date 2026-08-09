const childNotFoundBox = document.getElementById('childNotFoundBox');
const familyBlockedBox = document.getElementById('familyBlockedBox');
const childContent = document.getElementById('childContent');
const childGreeting = document.getElementById('childGreeting');
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const surpriseBtn = document.getElementById('surpriseBtn');
const errorBox = document.getElementById('errorBox');
const limitNotice = document.getElementById('limitNotice');
const storyBox = document.getElementById('storyBox');
const storyText = document.getElementById('storyText');
const storyTranslationText = document.getElementById('storyTranslationText');
const storyTranslationColumn = document.getElementById('storyTranslationColumn');
const storyColumnLabelEn = document.getElementById('storyColumnLabelEn');
const storyColumnLabelSk = document.getElementById('storyColumnLabelSk');
const readBtn = document.getElementById('readBtn');
const stopBtn = document.getElementById('stopBtn');
const translateBtn = document.getElementById('translateBtn');
const newStoryBtn = document.getElementById('newStoryBtn');
const reportBtn = document.getElementById('reportBtn');
const pastHistoryList = document.getElementById('pastHistoryList');
const dailyLimitHint = document.getElementById('dailyLimitHint');
const wordTranslationBubble = document.getElementById('wordTranslationBubble');
const voiceInputBtn = document.getElementById('voiceInputBtn');

// Minimalny pocet viet medzi dvoma zvukovymi efektami - 1 znamena "najviac raz v kazdej vete"
// (zvuk sa moze spustit hned v dalsej vete, nie skor).
const SOUND_SENTENCE_GAP = 1;

// Niektore mobilne prehliadace (typicky Android Chrome) nespolahlivo posielaju udalost
// "onboundary" pocas citania nahlas - bez nej sa nezvyraznuje text ani nespustaju zvukove
// efekty. Ak sa realne udalosti nezacnu objavovat vcas, prevezme odhadovany "fallback" casovac.
// Namiesto jednoducheho rovnomerneho tempa (slov za minutu, ktore casom citelne rozsynchronizuje
// text od hlasu, hlavne po interpunkcii) pocita pre kazde slovo odhadovany cas zaciatku podla
// poctu znakov (dlhsie slovo trva dlhsie vyslovit) a pripocita kratku pauzu po konci vety/casti
// vety - vdaka comu tempo citania oveľa lepsie sleduje realne tempo hlasu vratane odmlk.
const ESTIMATED_BASE_WORD_SECONDS = 0.15;
const ESTIMATED_CHAR_SECONDS = 0.045;
const ESTIMATED_SENTENCE_PAUSE_SECONDS = 0.35;
const ESTIMATED_CLAUSE_PAUSE_SECONDS = 0.12;
const ESTIMATED_HIGHLIGHT_START_DELAY = 450;
const ESTIMATED_HIGHLIGHT_TICK_MS = 90;

const childId = new URLSearchParams(window.location.search).get('child');

let utterance = null;
let storyRawText = '';
let currentStoryId = null;
let currentVoiceName = '';
let currentVoiceRate = 1;
let currentStoryLang = 'sk';
let soundsEnabled = false;
let dynamicSoundMap = new Map();
let wordSpans = [];
let wordCursor = 0;
let highlightedSpan = null;
let lastSoundSentence = -Infinity;
let boundaryEventFired = false;
let estimatedReadStartTime = 0;
let estimatedHighlightStartDelay = null;
let estimatedHighlightTimer = null;
let estimatedWordTimings = []; // kumulativny (neskalovany, t.j. pri rychlosti 1.0) cas zaciatku kazdeho slova v sekundach
let estimatedTimingCursor = 0;
let translationState = null; // { sentences: [{ startChar, endChar, el, chunks: [{startChar,endChar,el}] | null }] }
let highlightedTranslationEl = null;
let translationVisible = false;
let currentTranslationCache = null;
let wordBubbleRequestId = 0;
let wordBubbleHideTimer = null;

const WORD_BUBBLE_MAX_CHARS = 60;
const WORD_BUBBLE_AUTOHIDE_MS = 4000;

async function initChild() {
  await initLanguage();
  document.title = t('dieta_title');
  storyColumnLabelEn.textContent = `🇬🇧 ${t('language_option_en')}`;
  storyColumnLabelSk.textContent = `🇸🇰 ${t('language_option_sk')}`;

  if (!childId) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const statusRes = await fetch('api/settings/status');
    const status = statusRes.ok ? await statusRes.json() : { enabled: true };
    if (status.enabled === false) {
      familyBlockedBox.textContent = t('family_not_enabled_msg');
      familyBlockedBox.style.display = 'block';
      return;
    }

    const res = await fetch('api/children');
    const list = res.ok ? await res.json() : [];
    const child = list.find((c) => c.id === childId);
    if (!child) {
      childNotFoundBox.style.display = 'block';
      return;
    }
    childGreeting.textContent = `${t('dieta_greeting_prefix')} ${child.name}!`;
    childContent.style.display = 'block';
    promptInput.focus();
    loadPastHistory();
    loadDailyLimitHint();
    fetch(`api/children/${childId}/enter`, { method: 'POST' }).catch(() => {});
  } catch (err) {
    console.error('Nepodarilo sa overiť dieťa:', err);
    childNotFoundBox.style.display = 'block';
  }
}

async function loadDailyLimitHint() {
  const res = await fetch('api/settings/limits');
  if (!res.ok) return;
  const limits = await res.json();
  dailyLimitHint.textContent = tn('dieta_daily_limit_hint', limits.dailyStoryLimit);
}

initChild();

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    generateBtn.click();
  }
});

// Diktovanie temy hlasom namiesto pisania - rozpoznany text sa len vlozi do textboxu (nahradi
// jeho obsah), dieta ho pred odoslanim moze este rucne upravit alebo rovno odoslat Enterom.
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognitionCtor) {
  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  let recognizing = false;

  recognition.onstart = () => {
    recognizing = true;
    voiceInputBtn.classList.add('listening');
    voiceInputBtn.title = t('voice_input_btn_title_listening');
  };

  recognition.onend = () => {
    recognizing = false;
    voiceInputBtn.classList.remove('listening');
    voiceInputBtn.title = t('voice_input_btn_title');
  };

  recognition.onresult = (event) => {
    promptInput.value = event.results[0][0].transcript.slice(0, 300);
    promptInput.focus();
  };

  recognition.onerror = (event) => {
    if (event.error !== 'aborted' && event.error !== 'no-speech') {
      showError(t('dieta_error_voice_input'));
    }
  };

  voiceInputBtn.addEventListener('click', () => {
    if (recognizing) {
      recognition.stop();
      return;
    }
    hideError();
    recognition.lang = getLocaleTag();
    try {
      recognition.start();
    } catch (err) {
      // start() hodi vynimku, ak uz raz bezi (napr. dvojklik) - v takom pripade nic nerobime.
    }
  });
} else {
  voiceInputBtn.style.display = 'none';
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

function hideError() {
  errorBox.style.display = 'none';
}

function showLimitNotice(msg) {
  limitNotice.textContent = msg;
  limitNotice.style.display = 'block';
}

function hideLimitNotice() {
  limitNotice.style.display = 'none';
}

class LimitError extends Error {
  constructor(message) {
    super(message);
    this.isLimitError = true;
  }
}

function newParagraphEl() {
  const p = document.createElement('div');
  p.className = 'story-paragraph';
  return p;
}

function renderStoryText(text) {
  storyText.innerHTML = '';
  wordSpans = [];
  const wordRegex = /\S+/g;
  let match;
  let lastIndex = 0;
  let sentenceIndex = 0;
  let paragraph = newParagraphEl();
  storyText.appendChild(paragraph);
  while ((match = wordRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const gap = text.slice(lastIndex, match.index);
      // Odstavcovy zlom (dve a viac po sebe iducich noviek) zacina novy "story-paragraph" div
      // namiesto doslovneho vlozenia medzery - odsadenie odstavcov rieši CSS margin, vdaka comu
      // sa daju odseky medzi originalom a prekladom neskôr zarovnat na rovnaku vysku (viz
      // syncParagraphHeights).
      if (/\n\s*\n/.test(gap)) {
        paragraph = newParagraphEl();
        storyText.appendChild(paragraph);
      } else {
        paragraph.appendChild(document.createTextNode(gap));
      }
    }
    const startIndex = match.index;
    const span = document.createElement('span');
    span.className = 'story-word';
    span.textContent = match[0];
    span.dataset.start = startIndex;
    span.dataset.sentence = sentenceIndex;
    // Klik na slovo ho zvyrazni (a ak je zobrazeny preklad, zvyrazni aj jeho pripadny SK
    // pendant vpravo, inak sa - pre anglicku rozpravku - ukaze mala bublina s prekladom len
    // tohto slova) - funguje nezavisle od toho, ci prave bezi citanie nahlas. "startIndex" je
    // zamerne lokalna konstanta (nie "match.index" priamo) - "match" sa v cykle prepisuje, takze
    // by v uzavere po skonceni cyklu ukazoval na null.
    span.addEventListener('click', () => handleWordClick(span, startIndex));
    paragraph.appendChild(span);
    wordSpans.push(span);
    lastIndex = match.index + match[0].length;
    if (/[.!?]/.test(match[0])) {
      sentenceIndex += 1;
    }
  }
  if (lastIndex < text.length) {
    paragraph.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function resetHighlight() {
  if (highlightedSpan) highlightedSpan.classList.remove('story-word-active');
  highlightedSpan = null;
  if (highlightedTranslationEl) highlightedTranslationEl.classList.remove('story-word-active');
  highlightedTranslationEl = null;
  wordCursor = 0;
  lastSoundSentence = -Infinity;
}

function maybeTriggerSound(wordSpan) {
  if (!soundsEnabled || !wordSpan) return;
  const sentenceIndex = Number(wordSpan.dataset.sentence);
  if (sentenceIndex - lastSoundSentence < SOUND_SENTENCE_GAP) return;
  const normalized = normalizeWord(wordSpan.textContent);
  const soundType = dynamicSoundMap.get(normalized) || matchSoundForWord(wordSpan.textContent, currentStoryLang);
  if (!soundType) return;
  lastSoundSentence = sentenceIndex;
  playSoundEffect(soundType);
}

// Najde posledny slovny span, ktoreho start <= charIndex. Zamerne ide o uplne prehladanie (nie
// inkrementalny kurzor) - vdaka tomu funguje rovnako spolahlivo pre postupne (monotonne rastuce)
// udalosti pri citani nahlas, ako aj pre klik na lubovolne slovo v lubovolnom poradi (aj spatne).
function findWordIndexAtChar(charIndex) {
  let idx = -1;
  for (let i = 0; i < wordSpans.length; i += 1) {
    if (Number(wordSpans[i].dataset.start) <= charIndex) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

function highlightAtCharIndex(charIndex) {
  const idx = findWordIndexAtChar(charIndex);
  if (idx === -1) return;
  wordCursor = idx;
  const target = wordSpans[idx];
  if (target && target !== highlightedSpan) {
    if (highlightedSpan) highlightedSpan.classList.remove('story-word-active');
    target.classList.add('story-word-active');
    highlightedSpan = target;
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  if (translationVisible) highlightTranslationAtCharIndex(charIndex);
}

function renderTranslation(translation) {
  storyTranslationText.innerHTML = '';
  const sentences = [];
  let cursor = 0;
  let paragraph = newParagraphEl();
  storyTranslationText.appendChild(paragraph);

  (translation.sentences || []).forEach((s) => {
    const startChar = cursor;
    const en = s.en || '';
    const trailingWs = s.trailingWs || '';
    cursor = startChar + en.length;
    const endChar = cursor;
    cursor += trailingWs.length;

    if (s.chunks && s.chunks.length > 0) {
      const chunkEls = [];
      let localCursor = 0;
      s.chunks.forEach((c) => {
        const chunkStart = localCursor;
        localCursor += (c.en || '').length;
        const span = document.createElement('span');
        span.className = 'translation-chunk';
        span.textContent = c.sk;
        paragraph.appendChild(span);
        paragraph.appendChild(document.createTextNode(' '));
        chunkEls.push({ startChar: startChar + chunkStart, endChar: startChar + localCursor, el: span });
      });
      sentences.push({ startChar, endChar, chunks: chunkEls });
    } else {
      const span = document.createElement('span');
      span.className = 'translation-chunk';
      span.textContent = s.sk || s.en;
      paragraph.appendChild(span);
      sentences.push({ startChar, endChar, chunks: null, el: span });
    }

    // Rovnaka logika odstavcoveho zlomu ako v renderStoryText - "trailingWs" je presny useik
    // povodneho anglickeho textu, takze presne odzrkadluje, kde bol v originali odstavec.
    if (/\n\s*\n/.test(trailingWs)) {
      paragraph = newParagraphEl();
      storyTranslationText.appendChild(paragraph);
    } else {
      paragraph.appendChild(document.createTextNode(trailingWs || ' '));
    }
  });

  translationState = { sentences };
}

function resetParagraphHeights(container) {
  container.querySelectorAll(':scope > .story-paragraph').forEach((p) => {
    p.style.minHeight = '';
  });
}

// Zarovna kazdy par odstavcov (original a jeho preklad) na rovnaku vysku, aby boli vizualne
// pekne vedla seba aj ked ma niektory z jazykov na danom mieste dlhsi/kratsi text.
function syncParagraphHeights() {
  const enParas = storyText.querySelectorAll(':scope > .story-paragraph');
  const skParas = storyTranslationText.querySelectorAll(':scope > .story-paragraph');
  const count = Math.max(enParas.length, skParas.length);
  for (let i = 0; i < count; i += 1) {
    if (enParas[i]) enParas[i].style.minHeight = '';
    if (skParas[i]) skParas[i].style.minHeight = '';
  }
  for (let i = 0; i < count; i += 1) {
    const target = Math.max(enParas[i] ? enParas[i].offsetHeight : 0, skParas[i] ? skParas[i].offsetHeight : 0);
    if (enParas[i]) enParas[i].style.minHeight = `${target}px`;
    if (skParas[i]) skParas[i].style.minHeight = `${target}px`;
  }
}

window.addEventListener('resize', () => {
  if (translationVisible) syncParagraphHeights();
});

function findTranslationSentenceAt(charIndex) {
  if (!translationState) return null;
  return translationState.sentences.find((s) => charIndex >= s.startChar && charIndex < s.endChar) || null;
}

function highlightTranslationAtCharIndex(charIndex) {
  if (!translationState) return;
  const sentence = findTranslationSentenceAt(charIndex);
  let target = null;
  if (sentence) {
    if (sentence.chunks) {
      const chunk = sentence.chunks.find((c) => charIndex >= c.startChar && charIndex < c.endChar);
      target = chunk ? chunk.el : sentence.chunks[sentence.chunks.length - 1].el;
    } else {
      target = sentence.el;
    }
  }
  if (target !== highlightedTranslationEl) {
    if (highlightedTranslationEl) highlightedTranslationEl.classList.remove('story-word-active');
    if (target) {
      target.classList.add('story-word-active');
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    highlightedTranslationEl = target;
  }
}

// Zabezpeci, ze data prekladu su nacitane a ulozene v currentTranslationCache - ak uz su, nic
// nerobi (ziadne dalsie volanie na Anthropic). Pouziva ho ako tlacidlo "Simultánny preklad", tak
// aj bublina s prekladom jedneho slova - obe zdielaju TU ISTU (raz vygenerovanu a natrvalo
// ulozenu k rozprávke) sadu dat, takze pridanie bubliny nezvysuje spotrebu API.
async function ensureTranslationLoaded() {
  if (currentTranslationCache) return currentTranslationCache;
  const res = await fetch(`api/story/${currentStoryId}/translate`, { method: 'POST' });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.error || t('error_generic'));
  currentTranslationCache = data.translation;
  return currentTranslationCache;
}

// Najde preklad zodpovedajuci danemu znakovemu indexu v ORIGINALNOM texte, bez potreby renderovat
// dvojstlpcove zobrazenie - pouziva sa pre bublinu s prekladom jedneho slova. Vracia text chunku
// (zvycajne jedno slovo/kratka fraza), alebo ak pre danu vetu nie je zarovnanie k dispozicii,
// text celej vety (volny preklad).
function lookupTranslationTextAtChar(translation, charIndex) {
  if (!translation || !Array.isArray(translation.sentences)) return null;
  let cursor = 0;
  for (const s of translation.sentences) {
    const en = s.en || '';
    const trailingWs = s.trailingWs || '';
    const startChar = cursor;
    const endChar = startChar + en.length;
    cursor = endChar + trailingWs.length;
    if (charIndex < startChar || charIndex >= endChar) continue;

    if (s.chunks && s.chunks.length > 0) {
      let localCursor = 0;
      for (const c of s.chunks) {
        const chunkStart = startChar + localCursor;
        localCursor += (c.en || '').length;
        const chunkEnd = startChar + localCursor;
        if (charIndex >= chunkStart && charIndex < chunkEnd) return c.sk;
      }
      return s.chunks[s.chunks.length - 1].sk;
    }
    return s.sk || s.en;
  }
  return null;
}

// Skrati text zobrazovany v malej bublinke, aby zostala kompaktna aj pri volnom (celovetnom)
// preklade - orezanie sa robi na hranici slova, nie uprostred.
function truncateForBubble(text) {
  if (!text || text.length <= WORD_BUBBLE_MAX_CHARS) return text;
  return `${text.slice(0, WORD_BUBBLE_MAX_CHARS).replace(/\s+\S*$/, '')}…`;
}

function hideWordBubble() {
  clearTimeout(wordBubbleHideTimer);
  wordBubbleHideTimer = null;
  wordTranslationBubble.style.display = 'none';
}

function showWordBubble(anchorEl, text) {
  wordTranslationBubble.textContent = text;
  wordTranslationBubble.style.display = 'block';

  const anchorRect = anchorEl.getBoundingClientRect();
  const bubbleRect = wordTranslationBubble.getBoundingClientRect();
  let left = anchorRect.left + anchorRect.width / 2 - bubbleRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - bubbleRect.width - 8));
  let top = anchorRect.top - bubbleRect.height - 8;
  if (top < 8) top = anchorRect.bottom + 8;
  wordTranslationBubble.style.left = `${left}px`;
  wordTranslationBubble.style.top = `${top}px`;

  clearTimeout(wordBubbleHideTimer);
  wordBubbleHideTimer = setTimeout(hideWordBubble, WORD_BUBBLE_AUTOHIDE_MS);
}

// Klik na anglicke slovo mimo simultanneho (dvojstlpcoveho) zobrazenia - namiesto prepnutia na
// cely preklad ukaze malu bublinu s prekladom LEN tohto slova/frazy. Preklad rozpravky sa vyziada
// (a natrvalo ulozi) nanajvys raz za rozpravku - dalsie kliky uz len citaju z pamate, bez
// akehokolvek dalsieho volania na Anthropic.
async function handleWordClick(span, startIndex) {
  highlightAtCharIndex(startIndex);
  if (translationVisible || currentStoryLang !== 'en') return;

  const requestId = (wordBubbleRequestId += 1);
  showWordBubble(span, '…');
  try {
    const translation = await ensureTranslationLoaded();
    if (requestId !== wordBubbleRequestId) return; // medzitym uz prislo dalsie klikni
    const text = lookupTranslationTextAtChar(translation, startIndex);
    showWordBubble(span, truncateForBubble(text) || t('error_generic'));
  } catch (err) {
    if (requestId !== wordBubbleRequestId) return;
    showWordBubble(span, t('error_generic'));
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.story-word')) hideWordBubble();
});

function resetReportButton(reported) {
  reportBtn.disabled = !currentStoryId || reported;
  reportBtn.textContent = reported ? t('dieta_report_done') : t('dieta_report_btn');
}

async function reportCurrentStory() {
  if (!currentStoryId) return;
  reportBtn.disabled = true;
  try {
    await fetch(`api/story/${currentStoryId}/report`, { method: 'POST' });
    reportBtn.textContent = t('dieta_report_done');
  } catch (err) {
    reportBtn.disabled = false;
  }
}

function applyStoryResponse(data) {
  storyRawText = data.content;
  currentVoiceName = data.voiceName || '';
  currentVoiceRate = data.voiceRate || 1;
  currentStoryLang = data.language === 'en' ? 'en' : 'sk';
  soundsEnabled = !!data.soundsEnabled;
  currentStoryId = data.id || null;
  dynamicSoundMap = new Map();
  (data.soundCues || []).forEach((cue) => {
    if (cue && typeof cue.word === 'string' && typeof cue.type === 'string') {
      dynamicSoundMap.set(normalizeWord(cue.word), cue.type);
    }
  });
  renderStoryText(storyRawText);
  resetHighlight();
  window.speechSynthesis.cancel();

  // Preklad je viazany na konkretnu rozpravku - pri kazdej novej/znovu-prehratej rozpravke ho
  // resetujeme; ak uz bola predtym prelozena (napr. z historie), pouzijeme ulozenu kopiu bez
  // noveho volania na server.
  translationState = null;
  currentTranslationCache = data.translation || null;
  translationVisible = false;
  storyTranslationText.innerHTML = '';
  storyTranslationColumn.style.display = 'none';
  storyColumnLabelEn.style.display = 'none';
  translateBtn.disabled = false;
  translateBtn.textContent = t('dieta_translate_btn');
  translateBtn.style.display = currentStoryLang === 'en' ? 'inline-block' : 'none';
  wordBubbleRequestId += 1; // zrusi akukolvek prave prebiehajucu bublinu z predoslej rozpravky
  hideWordBubble();

  storyBox.style.display = 'block';
  storyBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  resetReportButton(!!data.reported);
}

async function parseJsonResponse(res) {
  const rawText = await res.text();
  try {
    return JSON.parse(rawText);
  } catch (parseErr) {
    console.error('Neplatná odpoveď servera. HTTP status:', res.status, 'Telo odpovede:', rawText.slice(0, 1000));
    throw new Error(`${t('dieta_error_bad_response')} (HTTP ${res.status})`);
  }
}

async function requestStory(body) {
  hideError();
  hideLimitNotice();
  storyBox.style.display = 'none';
  window.speechSynthesis.cancel();

  const res = await fetch('api/story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    if (data.limitReached) {
      showLimitNotice(data.error || t('error_generic'));
      throw new LimitError(data.error);
    }
    throw new Error(data.error || t('error_generic'));
  }
  applyStoryResponse(data);
  loadPastHistory();
}

async function generateStory() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showError(t('dieta_error_empty_prompt'));
    return;
  }
  generateBtn.disabled = true;
  surpriseBtn.disabled = true;
  generateBtn.innerHTML = `<span class="spinner"></span>${t('dieta_generating')}`;
  try {
    await requestStory({ prompt, childId });
  } catch (err) {
    if (!err.isLimitError) showError(err.message);
  } finally {
    generateBtn.disabled = false;
    surpriseBtn.disabled = false;
    generateBtn.textContent = t('dieta_generate_btn');
  }
}

async function generateSurpriseStory() {
  generateBtn.disabled = true;
  surpriseBtn.disabled = true;
  surpriseBtn.innerHTML = `<span class="spinner"></span>${t('dieta_generating')}`;
  try {
    await requestStory({ surprise: true, childId });
  } catch (err) {
    if (!err.isLimitError) showError(err.message);
  } finally {
    generateBtn.disabled = false;
    surpriseBtn.disabled = false;
    surpriseBtn.textContent = t('dieta_surprise_btn');
  }
}

// Predpocita pre kazde slovo odhadovany (neskalovany) cas jeho zaciatku - dlzka slova podla
// poctu znakov plus prípadna pauza po interpunkcii na jeho konci. Pocita sa raz na zaciatku
// citania (nie pri kazdom ticku), nasledne sa len porovnava s uplynutym casom.
function buildEstimatedWordTimings() {
  const timings = [];
  let t = 0;
  for (let i = 0; i < wordSpans.length; i += 1) {
    timings.push(t);
    const word = wordSpans[i].textContent;
    t += ESTIMATED_BASE_WORD_SECONDS + word.length * ESTIMATED_CHAR_SECONDS;
    const lastChar = word[word.length - 1];
    if (/[.!?]/.test(lastChar)) t += ESTIMATED_SENTENCE_PAUSE_SECONDS;
    else if (/[,;:]/.test(lastChar)) t += ESTIMATED_CLAUSE_PAUSE_SECONDS;
  }
  return timings;
}

// Odhaduje polohu citania podla uplynuteho casu a predpocitanej tabulky casov slov (namiesto
// skutocnych "onboundary" udalosti prehliadaca), a rovnako ako skutocna udalost zvyraznuje slovo
// aj spusta pripadny zvukovy efekt. Beží iba pokial sa realne "onboundary" udalosti vobec
// nezacnu objavovat. "estimatedTimingCursor" postupuje len dopredu (cas nikdy necuvne).
function estimatedHighlightTick() {
  if (boundaryEventFired) {
    stopEstimatedHighlight();
    return;
  }
  const elapsedSec = ((performance.now() - estimatedReadStartTime) / 1000) * (currentVoiceRate || 1);
  while (
    estimatedTimingCursor < estimatedWordTimings.length - 1 &&
    estimatedWordTimings[estimatedTimingCursor + 1] <= elapsedSec
  ) {
    estimatedTimingCursor += 1;
  }
  const target = wordSpans[estimatedTimingCursor];
  if (!target) return;
  highlightAtCharIndex(Number(target.dataset.start));
  maybeTriggerSound(target);
}

function startEstimatedHighlight() {
  stopEstimatedHighlight();
  boundaryEventFired = false;
  estimatedWordTimings = buildEstimatedWordTimings();
  estimatedTimingCursor = 0;
  estimatedReadStartTime = performance.now();
  // Kratke oneskorenie predtym, nez zacneme s odhadom - ak prehliadac skutocne posiela udalosti
  // "onboundary" (bezny pripad na desktope), medzitym uz nastavia boundaryEventFired a odhadovany
  // ticker sa vobec nespusti. Ak nie (niektore mobilne prehliadace, typicky Android Chrome, ich
  // nespolahlivo posielaju), odhadovany ticker prevezme zvyraznovanie aj spustanie zvukov.
  estimatedHighlightStartDelay = setTimeout(() => {
    if (boundaryEventFired) return;
    estimatedHighlightTimer = setInterval(estimatedHighlightTick, ESTIMATED_HIGHLIGHT_TICK_MS);
  }, ESTIMATED_HIGHLIGHT_START_DELAY);
}

function stopEstimatedHighlight() {
  clearTimeout(estimatedHighlightStartDelay);
  clearInterval(estimatedHighlightTimer);
  estimatedHighlightStartDelay = null;
  estimatedHighlightTimer = null;
}

function readAloud() {
  if (!('speechSynthesis' in window)) {
    showError(t('dieta_error_no_tts'));
    return;
  }
  window.speechSynthesis.cancel();
  resetHighlight();
  if (soundsEnabled) getAudioContext();

  utterance = new SpeechSynthesisUtterance(storyRawText);
  utterance.lang = currentStoryLang === 'en' ? 'en-US' : 'sk-SK';
  utterance.rate = currentVoiceRate || 0.95;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  // Ulozeny hlas dietata pouzijeme len ak jeho jazyk skutocne sedi s jazykom TEJTO konkretnej
  // rozpravky - inak by sa napr. anglicky hlas mohol pouzit na precitanie slovenskej rozpravky
  // (dieta mohlo medzitym zmenit svoj jazyk, alebo ide o starsiu rozpravku v inom jazyku).
  const chosenVoice =
    (currentVoiceName && voices.find((v) => v.name === currentVoiceName && v.lang && v.lang.toLowerCase().startsWith(currentStoryLang))) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(currentStoryLang));
  if (chosenVoice) utterance.voice = chosenVoice;

  utterance.onboundary = (event) => {
    boundaryEventFired = true;
    highlightAtCharIndex(event.charIndex);
    maybeTriggerSound(wordSpans[wordCursor]);
  };

  utterance.onend = () => {
    readBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    resetHighlight();
    stopEstimatedHighlight();
  };

  window.speechSynthesis.speak(utterance);
  startEstimatedHighlight();
  readBtn.style.display = 'none';
  stopBtn.style.display = 'inline-block';
}

function stopReading() {
  window.speechSynthesis.cancel();
  readBtn.style.display = 'inline-block';
  stopBtn.style.display = 'none';
  resetHighlight();
  stopEstimatedHighlight();
}

function formatHistoryDate(iso) {
  return new Date(iso).toLocaleString(getLocaleTag());
}

async function loadPastHistory() {
  const res = await fetch(`api/story/recent?child=${encodeURIComponent(childId)}`);
  if (!res.ok) return;
  const data = await res.json();
  const snapshot = {
    voiceName: data.voiceName || '',
    voiceRate: data.voiceRate || 1,
    language: data.language === 'en' ? 'en' : 'sk',
    soundsEnabled: !!data.soundsEnabled,
  };
  const stories = data.stories || [];

  pastHistoryList.innerHTML = '';
  if (stories.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'subtitle';
    empty.textContent = t('dieta_history_empty');
    pastHistoryList.appendChild(empty);
    return;
  }

  stories.forEach((s) => {
    const item = document.createElement('div');
    item.className = 'story-history-item';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = s.favorite
      ? `${formatHistoryDate(s.createdAt)} · ${t('dieta_favorite_badge')}`
      : formatHistoryDate(s.createdAt);

    const title = document.createElement('strong');
    title.textContent = s.childPrompt;

    const actions = document.createElement('div');
    actions.className = 'actions-row';

    const showAgainBtn = document.createElement('button');
    showAgainBtn.className = 'secondary';
    showAgainBtn.textContent = t('dieta_show_again_btn');
    showAgainBtn.addEventListener('click', () => {
      applyStoryResponse({
        id: s.id,
        reported: s.reported,
        content: s.content,
        voiceName: snapshot.voiceName,
        voiceRate: snapshot.voiceRate,
        language: s.language || snapshot.language,
        soundsEnabled: snapshot.soundsEnabled,
        soundCues: s.soundCues || [],
        // Preklad zamerne neposielame z historie priamo - moze byt ulozeny starsou verziou
        // algoritmu (viz TRANSLATION_VERSION v server/claude.js). Tlacidlo "Simultánny preklad"
        // si ho pri kliknuti vyziada nanovo cez server, ktory platnost verzie sam overi.
      });
      fetch(`api/story/${s.id}/replay`, { method: 'POST' }).catch(() => {});
    });

    const continueBtn = document.createElement('button');
    continueBtn.className = 'secondary';
    continueBtn.textContent = t('dieta_continue_btn');

    const continueForm = document.createElement('div');
    continueForm.style.display = 'none';
    continueForm.style.marginTop = '8px';

    const continueInput = document.createElement('textarea');
    continueInput.rows = 2;
    continueInput.placeholder = t('dieta_continue_placeholder');
    continueInput.maxLength = 200;

    const continueActions = document.createElement('div');
    continueActions.className = 'actions-row';

    const continueConfirmBtn = document.createElement('button');
    continueConfirmBtn.textContent = t('dieta_continue_confirm_btn');

    const continueCancelBtn = document.createElement('button');
    continueCancelBtn.className = 'secondary';
    continueCancelBtn.textContent = t('dieta_continue_cancel_btn');

    continueBtn.addEventListener('click', () => {
      const showing = continueForm.style.display !== 'none';
      continueForm.style.display = showing ? 'none' : 'block';
      if (!showing) continueInput.focus();
    });

    continueCancelBtn.addEventListener('click', () => {
      continueForm.style.display = 'none';
      continueInput.value = '';
    });

    continueConfirmBtn.addEventListener('click', async () => {
      hideError();
      hideLimitNotice();
      continueConfirmBtn.disabled = true;
      continueConfirmBtn.innerHTML = `<span class="spinner"></span>${t('dieta_continue_generating')}`;
      try {
        const res = await fetch('api/story/continue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ previousStoryId: s.id, characterNote: continueInput.value.trim() }),
        });
        const resData = await parseJsonResponse(res);
        if (!res.ok) {
          if (resData.limitReached) {
            showLimitNotice(resData.error || t('error_generic'));
            throw new LimitError(resData.error);
          }
          throw new Error(resData.error || t('error_generic'));
        }
        continueForm.style.display = 'none';
        continueInput.value = '';
        applyStoryResponse(resData);
        loadPastHistory();
      } catch (err) {
        if (!err.isLimitError) showError(err.message);
      } finally {
        continueConfirmBtn.disabled = false;
        continueConfirmBtn.textContent = t('dieta_continue_confirm_btn');
      }
    });

    continueInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        continueConfirmBtn.click();
      }
    });

    continueActions.appendChild(continueConfirmBtn);
    continueActions.appendChild(continueCancelBtn);
    continueForm.appendChild(continueInput);
    continueForm.appendChild(continueActions);

    const reportItemBtn = document.createElement('button');
    reportItemBtn.className = 'secondary';
    reportItemBtn.textContent = s.reported ? t('dieta_report_done') : t('dieta_report_btn');
    reportItemBtn.disabled = !!s.reported;
    reportItemBtn.addEventListener('click', async () => {
      reportItemBtn.disabled = true;
      try {
        await fetch(`api/story/${s.id}/report`, { method: 'POST' });
        reportItemBtn.textContent = t('dieta_report_done');
      } catch (err) {
        reportItemBtn.disabled = false;
      }
    });

    actions.appendChild(showAgainBtn);
    actions.appendChild(continueBtn);
    actions.appendChild(reportItemBtn);

    item.appendChild(meta);
    item.appendChild(title);
    item.appendChild(actions);
    item.appendChild(continueForm);
    pastHistoryList.appendChild(item);
  });
}

async function toggleTranslation() {
  if (translationVisible) {
    storyTranslationColumn.style.display = 'none';
    storyColumnLabelEn.style.display = 'none';
    translationVisible = false;
    translateBtn.textContent = t('dieta_translate_btn');
    resetParagraphHeights(storyText);
    return;
  }

  hideWordBubble(); // dvojstlpcove zobrazenie uz preklad ukazuje vsade, bublina by bola redundantna

  if (translationState) {
    storyTranslationColumn.style.display = 'block';
    storyColumnLabelEn.style.display = 'block';
    translationVisible = true;
    translateBtn.textContent = t('dieta_translate_hide_btn');
    syncParagraphHeights();
    return;
  }

  hideError();
  translateBtn.disabled = true;
  translateBtn.innerHTML = `<span class="spinner"></span>${t('dieta_translating')}`;
  try {
    const translation = await ensureTranslationLoaded();
    storyTranslationColumn.style.display = 'block';
    storyColumnLabelEn.style.display = 'block';
    renderTranslation(translation);
    syncParagraphHeights();
    translationVisible = true;
    translateBtn.textContent = t('dieta_translate_hide_btn');
  } catch (err) {
    showError(err.message);
    translateBtn.textContent = t('dieta_translate_btn');
  } finally {
    translateBtn.disabled = false;
  }
}

generateBtn.addEventListener('click', generateStory);
surpriseBtn.addEventListener('click', generateSurpriseStory);
readBtn.addEventListener('click', readAloud);
stopBtn.addEventListener('click', stopReading);
translateBtn.addEventListener('click', toggleTranslation);
reportBtn.addEventListener('click', reportCurrentStory);
newStoryBtn.addEventListener('click', () => {
  window.speechSynthesis.cancel();
  resetHighlight();
  hideWordBubble();
  storyBox.style.display = 'none';
  promptInput.value = '';
  promptInput.focus();
});

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {};
}
