const TRANSLATIONS = {
  sk: {
    back_link: '← Späť',
    add_btn: 'Pridať',
    error_generic: 'Niečo sa pokazilo.',

    index_title: 'Rozprávky na dobrú noc',
    index_heading: '🌙 Rozprávky na dobrú noc',
    index_subtitle: 'Vyber si, kto sa prihlasuje.',
    index_child_link: '🧸 Som dieťa',
    index_parent_link: '🔒 Som rodič',

    dieta_title: 'Rozprávka pre teba',
    dieta_heading: '🧸 O čom má byť dnešná rozprávka?',
    dieta_subtitle: 'Napíš, o čom chceš počuť rozprávku, a ja ti ju vyrozprávam.',
    dieta_prompt_placeholder: 'Napríklad: o drakovi, ktorý sa bál lietať...',
    dieta_generate_btn: '✨ Vytvor rozprávku',
    dieta_generating: 'Rozprávka sa píše...',
    dieta_read_btn: '🔊 Prečítať nahlas',
    dieta_stop_btn: '⏹ Zastaviť',
    dieta_new_story_btn: '📝 Nová rozprávka',
    dieta_error_empty_prompt: 'Napíš prosím, o čom má byť rozprávka.',
    dieta_error_bad_response: 'Server neodpovedal správne. Skús to prosím o chvíľu znova.',
    dieta_error_no_tts: 'Tento prehliadač bohužiaľ nevie čítať nahlas.',
    dieta_history_heading: '📖 Staršie rozprávky',
    dieta_history_empty: 'Zatiaľ žiadne staršie rozprávky.',
    dieta_favorite_badge: '⭐ obľúbená',
    dieta_show_again_btn: '🔊 Vypočuť znova',
    dieta_continue_btn: '➡️ Pokračovať',
    dieta_continue_placeholder: 'Chceš niečo zmeniť? (napr. pridaj alebo uber postavu) - nepovinné',
    dieta_continue_confirm_btn: 'Vytvoriť pokračovanie',
    dieta_continue_cancel_btn: 'Zrušiť',
    dieta_continue_generating: 'Pokračovanie sa píše...',

    rodic_title: 'Rodičovské nastavenia',
    setup_heading: '🔒 Vytvor si PIN',
    setup_subtitle: 'Tento PIN bude chrániť rodičovské nastavenia pred dieťaťom.',
    setup_pin_label: 'Nový PIN (4-6 číslic)',
    setup_btn: 'Nastaviť PIN',
    login_heading: '🔒 Zadaj PIN',
    login_btn: 'Prihlásiť sa',
    settings_heading: '👨‍👩‍👧 Rodičovské nastavenia',
    allowed_topics_label: 'Povolené témy (ak necháš prázdne, povolené sú všetky okrem zakázaných)',
    allowed_topics_placeholder: 'napr. zvieratká, vesmír',
    blocked_topics_label: 'Zakázané témy',
    blocked_topics_placeholder: 'napr. strašidlá, vojna',
    moral_lesson_label: 'Mravné ponaučenie pre nasledujúcu rozprávku (nechaj prázdne, ak žiadne nechceš)',
    moral_lesson_placeholder: 'napr. je dôležité deliť sa s kamarátmi',
    length_label: 'Požadovaná dĺžka rozprávky (počet slov)',
    length_between: 'od – do',
    girl_names_label: 'Odporúčané dievčenské mená postáv',
    girl_names_placeholder: 'napr. Zuzka, Emka',
    boy_names_label: 'Odporúčané chlapčenské mená postáv',
    boy_names_placeholder: 'napr. Jakub, Tomáš',
    adult_names_label: 'Odporúčané mená dospelých postáv (rodičia, starí rodičia...)',
    adult_names_placeholder: 'napr. mama Katka, starká Anna',
    language_label: 'Jazyk appky',
    language_hint: 'Po uložení sa do tohto jazyka prepne celá appka, vygenerované rozprávky aj predvolený hlas na čítanie.',
    language_option_sk: 'Slovenčina',
    language_option_en: 'English',
    voice_select_label: 'Hlas na čítanie rozprávky',
    voice_select_hint: 'Dostupné hlasy závisia od prehliadača, v ktorom dieťa rozprávku počúva - ak vybraný hlas tam nebude k dispozícii, použije sa náhradný.',
    voice_default_option: 'Predvolený (automaticky vybraný hlas podľa jazyka appky)',
    rate_label_prefix: 'Rýchlosť čítania:',
    test_voice_btn: '🔊 Vyskúšať hlas',
    sounds_enabled_label: 'Povoliť zvukové efekty počas čítania (napr. dážď, kačka, vlak)',
    save_settings_btn: '💾 Uložiť nastavenia',
    logout_btn: 'Odhlásiť sa',
    settings_saved_msg: 'Nastavenia uložené.',
    history_heading: '📖 História rozprávok',
    history_empty: 'Zatiaľ žiadne rozprávky.',
    history_moral_lesson_prefix: 'ponaučenie:',
    length_error: 'Dĺžka "od" musí byť vyplnená a nesmie byť väčšia ako dĺžka "do".',
    history_show_text_btn: 'Zobraziť text',
    history_hide_text_btn: 'Skryť text',
    history_favorite_on_btn: '⭐ Označiť ako obľúbenú',
    history_favorite_off_btn: '☆ Zrušiť obľúbenú',
    history_delete_btn: '🗑️ Zmazať',
    history_delete_confirm: 'Naozaj chceš natrvalo zmazať túto rozprávku z histórie?',
  },
  en: {
    back_link: '← Back',
    add_btn: 'Add',
    error_generic: 'Something went wrong.',

    index_title: 'Bedtime Stories',
    index_heading: '🌙 Bedtime Stories',
    index_subtitle: "Choose who's signing in.",
    index_child_link: "🧸 I'm a child",
    index_parent_link: "🔒 I'm a parent",

    dieta_title: 'A story for you',
    dieta_heading: "🧸 What should tonight's story be about?",
    dieta_subtitle: "Write what you'd like to hear a story about, and I'll tell it to you.",
    dieta_prompt_placeholder: 'For example: about a dragon who was afraid to fly...',
    dieta_generate_btn: '✨ Create story',
    dieta_generating: 'Writing the story...',
    dieta_read_btn: '🔊 Read aloud',
    dieta_stop_btn: '⏹ Stop',
    dieta_new_story_btn: '📝 New story',
    dieta_error_empty_prompt: 'Please write what the story should be about.',
    dieta_error_bad_response: 'The server did not respond correctly. Please try again shortly.',
    dieta_error_no_tts: "Unfortunately this browser can't read aloud.",
    dieta_history_heading: '📖 Past stories',
    dieta_history_empty: 'No past stories yet.',
    dieta_favorite_badge: '⭐ favorite',
    dieta_show_again_btn: '🔊 Listen again',
    dieta_continue_btn: '➡️ Continue',
    dieta_continue_placeholder: 'Want to change something? (e.g. add or remove a character) - optional',
    dieta_continue_confirm_btn: 'Create continuation',
    dieta_continue_cancel_btn: 'Cancel',
    dieta_continue_generating: 'Writing the continuation...',

    rodic_title: 'Parent settings',
    setup_heading: '🔒 Create a PIN',
    setup_subtitle: "This PIN will protect the parent settings from your child.",
    setup_pin_label: 'New PIN (4-6 digits)',
    setup_btn: 'Set PIN',
    login_heading: '🔒 Enter PIN',
    login_btn: 'Log in',
    settings_heading: '👨‍👩‍👧 Parent settings',
    allowed_topics_label: 'Allowed topics (leave empty to allow everything except blocked topics)',
    allowed_topics_placeholder: 'e.g. animals, space',
    blocked_topics_label: 'Blocked topics',
    blocked_topics_placeholder: 'e.g. monsters, war',
    moral_lesson_label: "Moral lesson for the next story (leave empty if you don't want one)",
    moral_lesson_placeholder: "e.g. it's important to share with friends",
    length_label: 'Desired story length (word count)',
    length_between: 'from – to',
    girl_names_label: 'Suggested girl character names',
    girl_names_placeholder: 'e.g. Zoe, Emma',
    boy_names_label: 'Suggested boy character names',
    boy_names_placeholder: 'e.g. Jacob, Thomas',
    adult_names_label: 'Suggested adult character names (parents, grandparents...)',
    adult_names_placeholder: 'e.g. mom Kate, grandma Anna',
    language_label: 'App language',
    language_hint: 'Once saved, the whole app, generated stories, and the default reading voice will switch to this language.',
    language_option_sk: 'Slovenčina',
    language_option_en: 'English',
    voice_select_label: 'Voice for reading the story',
    voice_select_hint: "Available voices depend on the browser your child listens on - if the chosen voice isn't available there, a fallback will be used.",
    voice_default_option: 'Default (automatically chosen voice matching the app language)',
    rate_label_prefix: 'Reading speed:',
    test_voice_btn: '🔊 Test voice',
    sounds_enabled_label: 'Enable sound effects during reading (e.g. rain, duck, train)',
    save_settings_btn: '💾 Save settings',
    logout_btn: 'Log out',
    settings_saved_msg: 'Settings saved.',
    history_heading: '📖 Story history',
    history_empty: 'No stories yet.',
    history_moral_lesson_prefix: 'moral:',
    length_error: 'The "from" length must be filled in and cannot be greater than the "to" length.',
    history_show_text_btn: 'Show text',
    history_hide_text_btn: 'Hide text',
    history_favorite_on_btn: '⭐ Mark as favorite',
    history_favorite_off_btn: '☆ Remove favorite',
    history_delete_btn: '🗑️ Delete',
    history_delete_confirm: 'Are you sure you want to permanently delete this story from history?',
  },
};

let currentLang = 'sk';

function t(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.sk;
  return dict[key] || TRANSLATIONS.sk[key] || key;
}

function getLocaleTag() {
  return currentLang === 'en' ? 'en-US' : 'sk-SK';
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.documentElement.lang = currentLang;
}

async function initLanguage() {
  try {
    const res = await fetch('api/settings/language');
    if (res.ok) {
      const data = await res.json();
      currentLang = data.language === 'en' ? 'en' : 'sk';
    }
  } catch (err) {
    // ostáva predvolená slovenčina, ak sa jazyk nepodarilo zistiť
  }
  applyTranslations();
  return currentLang;
}
