const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOUND_TYPES = [
  'rain', 'wind', 'thunder', 'duck', 'dog', 'cat', 'bird', 'train', 'water', 'fire',
  'bell', 'owl', 'horse', 'cow', 'sheep', 'clock', 'dragon', 'wolf', 'bear', 'frog',
  'mouse', 'rabbit', 'squirrel', 'magic', 'footsteps', 'laugh', 'splash', 'door',
];

const SURPRISE_TOPICS_SK_KIDS = [
  'o drakovi, ktorý sa učil lietať',
  'o mačiatku, ktoré sa stratilo v záhrade',
  'o čarovnom lese plnom svetlušiek',
  'o malom škriatkovi, ktorý stráži dúhu',
  'o veveričke, ktorá zbierala hviezdy namiesto orieškov',
  'o výprave na dno rybníka za stratenou perlou',
  'o robotíkovi, ktorý sa učí smiať',
  'o zajačikovi, ktorý si nevedel nájsť cestu domov',
  'o obláčiku, ktorý cestoval po celom svete',
  'o medvedíkovi, ktorý si zabudol, kde má brloh',
  'o princeznej, ktorá radšej stavala hrady z piesku ako zo skla',
  'o vláčiku, ktorý viezol deťom sny do snívania',
  'o žabke, ktorá chcela vidieť hviezdy zblízka',
  'o dvoch kamarátoch, ktorí si postavili loďku z lístia',
  'o sove, ktorá rozdávala dobré sny všetkým zvieratkám v lese',
];

const SURPRISE_TOPICS_SK_TEEN = [
  'o dlhej vlakovej ceste cez hory za úsvitu',
  'o tichej nočnej zmene v majáku pri mori',
  'o výprave na horský vrchol tesne pred rozbrieskom',
  'o malej kaviarni, kam si ľudia chodia rozprávať svoje príbehy',
  'o astronautovi, ktorý si v tichu vesmíru spomína na domov',
  'o starom rybárovi a jeho poslednom pokojnom výlove',
  'o meste, ktoré raz za rok úplne stíchne na jednu noc',
  'o dvoch priateľoch, ktorí si na streche mesta ukazujú súhvezdia',
  'o záhradníkovi, ktorý sa každý večer rozpráva so svojimi rastlinami',
  'o dedinskej knižnici, ktorá sa v noci mení na miesto plné príbehov',
  'o dlhej prechádzke lesom, počas ktorej si človek spomenie na dôležité veci',
  'o starom hodinárovi, ktorý opravuje spomienky namiesto hodiniek',
  'o tichej lodi plaviacej sa popri pobreží za súmraku',
  'o kempovaní pod hviezdami, ďaleko od telefónov a zhonu',
  'o ceste vlakom naprieč krajinou, počas ktorej si cestujúci spomínajú na svoje sny',
];

const SURPRISE_TOPICS_EN_KIDS = [
  'about a dragon who was learning to fly',
  'about a kitten who got lost in the garden',
  'about a magical forest full of fireflies',
  'about a little gnome who guards a rainbow',
  'about a squirrel who collected stars instead of acorns',
  'about a journey to the bottom of a pond to find a lost pearl',
  'about a little robot learning how to laugh',
  'about a bunny who could not find its way home',
  'about a little cloud who traveled around the whole world',
  'about a bear cub who forgot where its den was',
  'about a princess who preferred building sandcastles to glass ones',
  'about a little train that carries dreams to sleeping children',
  'about a frog who wanted to see the stars up close',
  'about two friends who built a little boat out of leaves',
  'about an owl who handed out good dreams to all the forest animals',
];

const SURPRISE_TOPICS_EN_TEEN = [
  'about a long train ride through the mountains at dawn',
  'about a quiet night shift at a lighthouse by the sea',
  'about a hike to a mountain summit just before sunrise',
  'about a small café where people go to tell their stories',
  'about an astronaut remembering home in the quiet of space',
  'about an old fisherman and his last peaceful catch of the day',
  'about a town that falls completely silent for one night each year',
  'about two friends pointing out constellations from a city rooftop',
  'about a gardener who talks to their plants every evening',
  'about a small village library that turns into a place full of stories at night',
  'about a long walk through the woods where someone remembers what matters',
  'about an old clockmaker who repairs memories instead of clocks',
  'about a quiet boat sailing along the coast at dusk',
  'about camping under the stars, far from phones and rush',
  'about a cross-country train ride where passengers share their dreams',
];

function pickSurpriseTopic({ allowedTopics, age, language }) {
  if (allowedTopics && allowedTopics.length > 0) {
    return allowedTopics[Math.floor(Math.random() * allowedTopics.length)];
  }
  const isEnglish = language === 'en';
  const isTeen = Number(age) >= 12;
  const pool = isEnglish
    ? isTeen
      ? SURPRISE_TOPICS_EN_TEEN
      : SURPRISE_TOPICS_EN_KIDS
    : isTeen
      ? SURPRISE_TOPICS_SK_TEEN
      : SURPRISE_TOPICS_SK_KIDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function ageBandInstruction(age, isEnglish) {
  const n = Number(age);
  if (!Number.isFinite(n) || n <= 6) {
    return isEnglish
      ? 'The listener is a young child (6 or younger) - use very simple language, short sentences, and a classic fairy-tale style with a simple plot (animals, gentle magic, simple little adventures).'
      : 'Poslucháč/poslucháčka je malé dieťa (6 rokov alebo menej) - použi veľmi jednoduchý jazyk, krátke vety a klasický rozprávkový štýl s jednoduchým dejom (zvieratká, jemné kúzla, jednoduché dobrodružstvá).';
  }
  if (n <= 11) {
    return isEnglish
      ? `The listener is ${n} years old - you can use somewhat richer language and a more interesting plot than for a toddler, but it should still clearly be a bedtime fairy tale for a child, not a complex story.`
      : `Poslucháč/poslucháčka má ${n} rokov - môžeš použiť o niečo bohatší jazyk a zaujímavejší dej ako pre batoľa, stále to však má byť rozprávka na dobrú noc pre dieťa, nie zložitý príbeh.`;
  }
  return isEnglish
    ? `The listener is ${n} years old - a teenager. Instead of a childish "fairy tale", write a calm, soothing STORY appropriate for their age, with a more mature, less childish tone (it doesn't need magical creatures or classic fairy-tale elements - it can be a more realistic, reflective, or gently adventurous story). It must still avoid anything scary, violent, or anxiety-inducing, and end in a calm, sleep-inducing way.`
    : `Poslucháč/poslucháčka má ${n} rokov - je to teenager. Namiesto detskej "rozprávky" napíš pokojný, upokojujúci PRÍBEH primeraný jeho veku, s vyspelejším, menej detinským tónom (nemusí obsahovať čarovné bytosti ani klasické rozprávkové prvky, pokojne môže ísť o realistickejší, introspektívny alebo jemne dobrodružný príbeh). Stále však nesmie obsahovať nič strašidelné, násilné ani úzkostné, a má sa skončiť pokojne, uspávajúco.`;
}

function intensityInstruction(intensity, isEnglish) {
  const n = Number(intensity);
  const value = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;

  if (value <= 20) {
    return isEnglish
      ? 'Story intensity: keep it VERY calm - almost no tension or adventure, just a gentle, soothing description of a peaceful moment or activity.'
      : 'Intenzita rozprávky: drž ju VEĽMI pokojnú - takmer žiadne napätie ani dobrodružstvo, len jemný, upokojujúci opis pokojnej chvíle alebo činnosti.';
  }
  if (value <= 40) {
    return isEnglish
      ? 'Story intensity: keep it calm - only very mild, gentle challenges that resolve quickly and peacefully.'
      : 'Intenzita rozprávky: drž ju pokojnú - iba veľmi mierne, jemné výzvy, ktoré sa rýchlo a pokojne vyriešia.';
  }
  if (value <= 60) {
    return isEnglish
      ? 'Story intensity: a balanced tone - a small adventure or gentle challenge is fine, as long as it resolves warmly.'
      : 'Intenzita rozprávky: vyvážený tón - malé dobrodružstvo alebo jemná výzva je v poriadku, nech sa vyrieši v teple.';
  }
  if (value <= 80) {
    return isEnglish
      ? 'Story intensity: more adventurous - an engaging adventure or exploration with some mild suspense is welcome, as long as it stays safe and ends calmly.'
      : 'Intenzita rozprávky: dobrodružnejšia - pokojne zahrň pútavé dobrodružstvo alebo objavovanie s miernym napätím, pokiaľ zostane bezpečné a skončí sa pokojne.';
  }
  return isEnglish
    ? 'Story intensity: quite adventurous - a lively, exciting adventure with real exploration and mild suspense is welcome, though it must still stay age-appropriate, never scary or violent, and end in a calm, sleep-inducing way.'
    : 'Intenzita rozprávky: dosť dobrodružná - pokojne zahrň živé, vzrušujúce dobrodružstvo so skutočným objavovaním a miernym napätím, musí však zostať primerané veku, nikdy nie strašidelné či násilné, a skončiť sa pokojne, uspávajúco.';
}

function addressInstruction(name, gender, isEnglish) {
  if (isEnglish) {
    return `The listener's name is ${name}${gender ? ` (${gender === 'girl' ? 'a girl' : 'a boy'})` : ''}. Feel free to use their name in the story, and if you address them directly (e.g. at the end), use pronouns matching their gender.`;
  }
  const genderWord = gender === 'boy' ? 'chlapec' : 'dievča';
  const example = gender === 'boy' ? '"môj milý", "usni sladko, chlapče"' : '"moja milá", "usni sladko, dievčatko"';
  return `Poslucháč/poslucháčka sa volá ${name} a je to ${genderWord}. Pokojne použi jeho/jej meno priamo v príbehu, a keď sa v rozprávke priamo prihovoríš dieťaťu (napr. v úvode či závere), osloví ho v zodpovedajúcom gramatickom rode (napr. ${example}).`;
}

function buildSystemPrompt({ allowedTopics, blockedTopics, moralLesson, minLength, maxLength, girlNames, boyNames, adultNames, language, previousContent, characterNote, childName, childAge, childGender, childIntensity }) {
  const isEnglish = language === 'en';
  const lines = [
    isEnglish
      ? 'You are a kind narrator who tells calm bedtime stories to children and young listeners.'
      : 'Si láskavý rozprávač, ktorý deťom a mladým poslucháčom rozpráva pokojné príbehy na dobrú noc.',
    isEnglish
      ? 'IMPORTANT: Write the entire story in English, regardless of the language of these instructions.'
      : 'DÔLEŽITÉ: Celú rozprávku napíš v slovenčine.',
    ageBandInstruction(childAge, isEnglish),
    intensityInstruction(childIntensity, isEnglish),
    isEnglish
      ? 'The story must not contain anything scary, violent, or anxiety-inducing - it should calm the listener before sleep.'
      : 'Príbeh nesmie obsahovať nič strašidelné, násilné ani úzkostné - má poslucháča upokojiť pred spaním.',
    isEnglish
      ? `Length: approximately ${minLength}-${maxLength} words, a pleasant, slow ending that induces sleep.`
      : `Dĺžka: približne ${minLength}-${maxLength} slov, príjemný a pomalý záver, ktorý navodzuje spánok.`,
  ];

  if (childName) {
    lines.push(addressInstruction(childName, childGender, isEnglish));
  }

  if (previousContent) {
    lines.push(
      isEnglish
        ? `This is a CONTINUATION of a previous bedtime story. Here is its full text for context:\n"""\n${previousContent}\n"""\nWrite a NEW, self-contained story that continues with the same main characters and world (same names, personalities, setting) as the story above. Don't summarize the previous story - start right into a new adventure, and don't repeat its plot.`
        : `Toto je POKRAČOVANIE predchádzajúcej rozprávky. Tu je jej celý text pre kontext:\n"""\n${previousContent}\n"""\nNapíš NOVÚ, samostatnú rozprávku, ktorá pokračuje s tými istými hlavnými postavami a svetom (rovnaké mená, povahy, prostredie) ako v príbehu vyššie. Predchádzajúci dej nezhŕňaj - začni rovno novým dobrodružstvom a neopakuj jeho dej.`
    );
    if (characterNote) {
      lines.push(
        isEnglish
          ? `For this continuation, incorporate this requested change to the characters: "${characterNote}". Work it naturally into the story.`
          : `Pre toto pokračovanie zapracuj túto požadovanú zmenu v postavách: "${characterNote}". Zakomponuj ju do príbehu prirodzene.`
      );
    }
  }

  if (blockedTopics && blockedTopics.length > 0) {
    lines.push(
      `Nikdy do rozprávky nezahŕňaj tieto zakázané témy, ani keď si ich dieťa vyžiada: ${blockedTopics.join(', ')}. Ak si dieťa vyžiada niečo z tohto zoznamu, jemne a nenápadne rozprávku nasmeruj k inej, príbuznej a povolenej téme, bez toho aby si dieťaťu vysvetľoval prečo.`
    );
  }

  if (allowedTopics && allowedTopics.length > 0) {
    lines.push(
      `Rozprávka sa má týkať iba týchto povolených tém (alebo im podobných): ${allowedTopics.join(', ')}. Ak požiadavka dieťaťa nezapadá do žiadnej z nich, jemne ju nasmeruj k najbližšej povolenej téme.`
    );
  }

  if (moralLesson) {
    lines.push(
      `Do tejto rozprávky prirodzene zakomponuj nasledovné mravné ponaučenie: "${moralLesson}". Ponaučenie má vyplynúť z deja príbehu a jeho záveru - nemá pôsobiť ako moralizovanie ani sa citovať doslovne, ale ako prirodzená súčasť rozprávky.`
    );
  }

  if (girlNames && girlNames.length > 0) {
    lines.push(`Ak rozprávka obsahuje dievčenskú postavu a potrebuje meno, uprednostni jedno z týchto mien: ${girlNames.join(', ')}.`);
  }

  if (boyNames && boyNames.length > 0) {
    lines.push(`Ak rozprávka obsahuje chlapčenskú postavu a potrebuje meno, uprednostni jedno z týchto mien: ${boyNames.join(', ')}.`);
  }

  if (adultNames && adultNames.length > 0) {
    lines.push(`Ak rozprávka obsahuje dospelú postavu (napr. rodič, starý rodič, iný dospelý) a potrebuje meno, uprednostni jedno z týchto mien: ${adultNames.join(', ')}.`);
  }

  lines.push(
    isEnglish
      ? 'Reply with only the story text itself, in English, with no title and no extra commentary.'
      : 'Odpovedz iba samotným textom rozprávky, bez nadpisu a bez akéhokoľvek komentára navyše.'
  );

  return lines.join('\n');
}

async function generateStory({ childPrompt, allowedTopics, blockedTopics, moralLesson, minLength, maxLength, girlNames, boyNames, adultNames, language, previousContent, characterNote, childName, childAge, childGender, childIntensity }) {
  const system = buildSystemPrompt({ allowedTopics, blockedTopics, moralLesson, minLength, maxLength, girlNames, boyNames, adultNames, language, previousContent, characterNote, childName, childAge, childGender, childIntensity });
  const maxTokens = Math.min(4000, Math.max(300, Math.round(maxLength * 4)));

  const userContent = previousContent
    ? characterNote
      ? `Napíš pokračovanie rozprávky. Zmena postáv: ${characterNote}`
      : 'Napíš pokračovanie rozprávky.'
    : `Dieťa chce počuť rozprávku na tému: ${childPrompt}`;

  const message = await client.messages.create(
    {
      model: 'claude-sonnet-5',
      max_tokens: maxTokens,
      system,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    },
    { timeout: 45_000 }
  );

  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

async function extractSoundCues({ content, language }) {
  const isEnglish = language === 'en';
  const system = isEnglish
    ? `You analyze a children's bedtime story and pick which exact words in it should trigger a sound effect.\n\nAvailable sound types (you must pick ONLY from this list): ${SOUND_TYPES.join(', ')}.\nPick 5 to 7 words (at most 8) that appear literally in the story text (exact spelling, same grammatical form as written) and represent the story's most important characters or setting. Prefer the main character(s) and the place where the story happens. Each "word" must be a single word with no spaces. If fewer than 5 good matches exist, return as many good ones as you can find (at least 2-3).`
    : `Analyzuješ detskú rozprávku na dobrú noc a vyberáš, ktoré presné slová v nej by mali spustiť zvukový efekt.\n\nDostupné typy zvukov (vyberaj IBA z tohto zoznamu): ${SOUND_TYPES.join(', ')}.\nVyber 5 až 7 slov (najviac 8), ktoré sa doslovne nachádzajú v texte rozprávky (presný pravopis, presne ten skloňovaný tvar, aký je v texte napísaný) a reprezentujú najdôležitejšie postavy alebo miesto deja. Uprednostni hlavnú postavu/postavy a prostredie príbehu. Každé "word" musí byť jedno slovo bez medzery. Ak sa nedá nájsť aspoň 5 vhodných, vráť aspoň toľko, koľko sa dá (minimálne 2-3).`;

  try {
    const message = await client.messages.create(
      {
        model: 'claude-sonnet-5',
        max_tokens: 600,
        system,
        tools: [
          {
            name: 'attach_sound_cues',
            description: 'Report which exact words from the story should trigger a matching sound effect.',
            input_schema: {
              type: 'object',
              properties: {
                soundCues: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      word: { type: 'string', description: 'Exact single word copied from the story text.' },
                      type: { type: 'string', enum: SOUND_TYPES },
                    },
                    required: ['word', 'type'],
                  },
                },
              },
              required: ['soundCues'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'attach_sound_cues' },
        messages: [{ role: 'user', content }],
      },
      { timeout: 20_000 }
    );

    const toolBlock = message.content.find((block) => block.type === 'tool_use' && block.name === 'attach_sound_cues');
    if (!toolBlock || !toolBlock.input) return [];

    // Model niekedy vráti soundCues ako (dvojito zabalený) JSON string namiesto pola.
    let cues = toolBlock.input.soundCues;
    if (typeof cues === 'string') {
      try {
        const parsed = JSON.parse(cues);
        cues = Array.isArray(parsed) ? parsed : parsed.soundCues;
      } catch (err) {
        cues = null;
      }
    }
    if (!Array.isArray(cues)) return [];

    return cues
      .filter((cue) => cue && typeof cue.word === 'string' && !cue.word.includes(' ') && SOUND_TYPES.includes(cue.type))
      .slice(0, 8);
  } catch (err) {
    console.error('Chyba pri extrakcii zvukových podnetov:', err);
    return [];
  }
}

async function suggestBlockedTopics({ content, childPrompt, language }) {
  const isEnglish = language === 'en';
  const system = isEnglish
    ? 'A child was upset or scared by this bedtime story, and their parent reported it. Suggest 2 to 5 short topics or keywords (a single word or a very short phrase each, in English) that the parent could add to their "blocked topics" list to avoid similar stories in the future. Base them on what specifically in THIS story could have been upsetting (a specific creature, situation, emotion, or theme) - not generic advice.'
    : 'Dieťa bolo touto rozprávkou na dobrú noc vystrašené alebo rozrušené a rodič ju nahlásil. Navrhni 2 až 5 krátkych tém alebo kľúčových slov (každé jedno slovo alebo veľmi krátka fráza, po slovensky), ktoré by rodič mohol pridať do zoznamu "zakázané témy", aby sa podobným rozprávkam v budúcnosti vyhol. Vychádzaj z toho, čo konkrétne v TEJTO rozprávke mohlo byť rozrušujúce (konkrétna bytosť, situácia, emócia alebo téma) - nie zo všeobecných rád.';

  try {
    const message = await client.messages.create(
      {
        model: 'claude-sonnet-5',
        max_tokens: 300,
        system,
        tools: [
          {
            name: 'suggest_blocked_topics',
            description: "Suggest short topic/keyword candidates for the parent's blocked-topics list.",
            input_schema: {
              type: 'object',
              properties: {
                topics: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['topics'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'suggest_blocked_topics' },
        messages: [
          {
            role: 'user',
            content: `Téma, ktorú si dieťa vyžiadalo: ${childPrompt}\n\nText rozprávky:\n${content}`,
          },
        ],
      },
      { timeout: 20_000 }
    );

    const toolBlock = message.content.find((block) => block.type === 'tool_use' && block.name === 'suggest_blocked_topics');
    if (!toolBlock || !toolBlock.input) return [];

    let topics = toolBlock.input.topics;
    if (typeof topics === 'string') {
      try {
        const parsed = JSON.parse(topics);
        topics = Array.isArray(parsed) ? parsed : parsed.topics;
      } catch (err) {
        topics = null;
      }
    }
    if (!Array.isArray(topics)) return [];

    return topics
      .filter((topic) => typeof topic === 'string' && topic.trim())
      .map((topic) => topic.trim().slice(0, 60))
      .slice(0, 5);
  } catch (err) {
    console.error('Chyba pri návrhu zakázaných tém:', err);
    return [];
  }
}

module.exports = { generateStory, extractSoundCues, pickSurpriseTopic, suggestBlockedTopics };
