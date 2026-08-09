const MESSAGES = {
  sk: {
    authRequired: 'Vyžaduje sa prihlásenie rodiča.',
    pinAlreadySet: 'PIN už je nastavený.',
    pinInvalid: 'PIN musí mať 4 až 6 číslic.',
    pinNotSet: 'PIN ešte nie je nastavený.',
    pinWrong: 'Nesprávny PIN.',
    lengthOrderError: 'Dĺžka "od" nemôže byť väčšia ako dĺžka "do".',
    promptRequired: 'Napíš, o čom má byť rozprávka.',
    storyGenerationFailed: 'Rozprávku sa teraz nepodarilo vygenerovať. Skús to prosím znova.',
    storyNotFound: 'Rozprávka sa nenašla.',
    childInvalid: 'Zadaj meno, vek (0-18) a pohlavie dieťaťa.',
    childNotFound: 'Toto dieťa sa nenašlo.',
    childRequired: 'Vyber, pre ktoré dieťa má byť rozprávka.',
    unknownApiPath: 'Neznáma API cesta.',
    unexpectedError: 'Nastala neočakávaná chyba na serveri.',
  },
  en: {
    authRequired: 'Parent login required.',
    pinAlreadySet: 'PIN is already set.',
    pinInvalid: 'PIN must be 4 to 6 digits.',
    pinNotSet: 'PIN is not set yet.',
    pinWrong: 'Incorrect PIN.',
    lengthOrderError: 'The "from" length cannot be greater than the "to" length.',
    promptRequired: 'Write what the story should be about.',
    storyGenerationFailed: 'Could not generate the story right now. Please try again.',
    storyNotFound: 'Story not found.',
    childInvalid: 'Enter a name, age (0-18), and gender for the child.',
    childNotFound: 'This child was not found.',
    childRequired: 'Choose which child the story is for.',
    unknownApiPath: 'Unknown API path.',
    unexpectedError: 'An unexpected server error occurred.',
  },
};

function t(key, lang) {
  const dict = MESSAGES[lang] || MESSAGES.sk;
  return dict[key] || MESSAGES.sk[key] || key;
}

function dailyLimitMessage({ age, gender, language, limit }) {
  const isEnglish = language === 'en';
  const n = Number(age);
  const isTeen = Number.isFinite(n) && n >= 12;
  const isBoy = gender === 'boy';

  if (isEnglish) {
    return isTeen
      ? `🌙 You've reached today's story limit (${limit}). Come back tomorrow for another one - it's time to rest now.`
      : "🌙💤 You've listened to enough stories for today! There will be a new one tomorrow. Time to snuggle up and sleep tight.";
  }

  if (isTeen) {
    const participle = isBoy ? 'dosiahol' : 'dosiahla';
    return `🌙 Dnes si už ${participle} dnešný limit rozprávok (${limit}). Skús to znova zajtra - teraz je čas na odpočinok.`;
  }
  const participle = isBoy ? 'vypočul' : 'vypočula';
  return `🌙💤 Dnes si už ${participle} dosť rozprávok! Zajtra ťa čaká ďalšia. Teraz je čas uložiť sa a snívať pekné sny.`;
}

function childrenLimitMessage(limit, language) {
  return language === 'en'
    ? `A family can have at most ${limit} children.`
    : `V jednej rodine môže byť najviac ${limit} detí.`;
}

module.exports = { t, dailyLimitMessage, childrenLimitMessage };
