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
    unknownApiPath: 'Unknown API path.',
    unexpectedError: 'An unexpected server error occurred.',
  },
};

function t(key, lang) {
  const dict = MESSAGES[lang] || MESSAGES.sk;
  return dict[key] || MESSAGES.sk[key] || key;
}

module.exports = { t };
