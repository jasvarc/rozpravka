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
  'o slimákovi, ktorý sa preteka s vetrom',
  'o motýlikovi, ktorý maľoval dúhu krídlami',
  'o ježkovi, ktorý zbieral padajúce hviezdy',
  'o rybke, ktorá sa naučila spievať pod vodou',
  'o mesiačiku, ktorý sa hral na schovávačku s oblakmi',
  'o malom vláčiku, čo sa bál tunelov',
  'o víle, ktorá stráži kvety v záhrade',
  'o psíkovi, ktorý strážil sny malých detí',
  'o korytnačke, ktorá vyhrala preteky pomaly a isto',
  'o dvoch mravčekoch, ktorí si postavili domček z lístočka',
  'o snehuliakovi, ktorý sníval o lete',
  'o vtáčikovi, ktorý sa učil svoj prvý let',
  'o malej hviezdičke, ktorá spadla na zem a hľadala cestu domov',
  'o kúzelnom dáždniku, ktorý menil dážď na farebné bubliny',
  'o myške, ktorá si postavila hrad zo syra',
  'o balónikovi, ktorý letel až za dúhu',
  'o macíkovi, ktorý sa naučil piecť medové koláčiky',
  'o malom delfínovi, ktorý objavoval more',
  'o líške, ktorá sa spriatelila so zajkom',
  'o zvončeku, ktorý zvonil len keď niekto zaspával',
  'o obrovi, ktorý bol v skutočnosti veľmi jemný a láskavý',
  'o čarodejníckom učňovi, ktorý sa naučil kúzlo dobrej noci',
  'o malej korytnačke, čo si niesla svoj domček na chrbte cez celý svet',
  'o kôzočke, ktorá preskočila cez dúhu',
  'o obláčiku dažďa, ktorý zavlažoval smutnú kvetinku',
  'o rodinke ježkov, ktorá sa pripravovala na zimný spánok',
  'o malom škriatkovi, ktorý stratil svoju čiapočku',
  'o vtáčej rodinke, ktorá si stavala hniezdo na najvyššom strome',
  'o kamarátstve medzi mesiacom a malou hviezdičkou',
  'o zajkovi, ktorý počítal ovečky, aby zaspal',
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
  'o poslednom vlaku, ktorý odchádza z malej stanice o polnoci',
  'o mladom pekárovi, ktorý pečie chlieb skoro ráno v tichu mesta',
  'o dvoch susedoch, ktorí si každý večer sadajú na balkón a rozprávajú sa',
  'o starej knižnici plnej zabudnutých listov',
  'o ceste na bicykli po pobreží pri západe slnka',
  'o nočnom strážcovi múzea, ktorý má rád ticho medzi exponátmi',
  'o dievčati, ktoré sa naučilo hrať na klavíri len pre seba',
  'o horskej chate, kam ľudia chodia hľadať pokoj',
  'o rybárovi, ktorý každé ráno pozoruje hmlu nad jazerom',
  'o starých priateľoch, ktorí sa po rokoch stretnú na známom mieste',
  'o ceste vlakom cez zasnežené hory tesne pred Vianocami',
  'o mladom umelcovi, ktorý maľuje oblohu z okna svojej izby',
  'o babičke, ktorá učí vnúča piecť koláč podľa starého receptu',
  'o malej reštaurácii, ktorá je otvorená len v noci pre nespavcov',
  'o dvoch cudzincoch, ktorí sa stretnú na nočnom vlaku a rozprávajú si príbehy',
  'o starom majákovníkovi, ktorý si spomína na svoje mladé roky na mori',
  'o tichej dedinke vysoko v horách, kam nechodia autá',
  'o dievčati, ktoré píše listy, ktoré nikdy neodošle',
  'o dvoch bratoch, ktorí si stavajú spoločný sen na povale starého domu',
  'o ceste loďou popri pobreží počas letnej búrky, ktorá sa upokojí do ticha',
  'o starom hodinárovi, ktorý rozpráva čas ako príbehy',
  'o žene, ktorá pestuje záhradu na streche mesta',
  'o dvoch kamarátkach, ktoré si sľúbia stretnúť sa o desať rokov na tom istom mieste',
  'o chlapcovi, ktorý sa naučil hrať na gitare od svojho starého otca',
  'o pouličnom hudobníkovi, ktorý hrá len pre tých, čo sa zastavia',
  'o rodinke, ktorá každý rok trávi posledný večer roka na streche pozorovaním hviezd',
  'o dievčati, ktoré sa naučilo piecť chlieb od cudzej ženy v malom mestečku',
  'o starcovi, ktorý každý deň kŕmi vtáky na tom istom mieste v parku',
  'o dvoch susedných záhradách oddelených len nízkym plotom a veľkým priateľstvom',
  'o poslednom lete pred odchodom na vysokú školu, strávenom s najlepším priateľom',
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
  'about a snail who raced against the wind',
  'about a little butterfly who painted rainbows with its wings',
  'about a hedgehog who collected falling stars',
  'about a little fish who learned to sing underwater',
  'about the moon playing hide and seek with the clouds',
  'about a little train who was scared of tunnels',
  'about a fairy who watches over the garden flowers',
  "about a puppy who guarded children's dreams",
  'about a tortoise who won a race by going slow and steady',
  'about two little ants who built a house from a leaf',
  'about a snowman who dreamed of summer',
  'about a little bird learning to fly for the first time',
  'about a tiny star who fell to earth and looked for the way home',
  'about a magic umbrella that turned rain into colorful bubbles',
  'about a mouse who built a castle out of cheese',
  'about a balloon that flew all the way past the rainbow',
  'about a bear cub who learned to bake honey cookies',
  'about a little dolphin exploring the sea',
  'about a fox who became friends with a bunny',
  'about a little bell that only rang when someone was falling asleep',
  'about a giant who was actually very gentle and kind',
  'about a young wizard who learned a goodnight spell',
  'about a little turtle who carried her house on her back across the whole world',
  'about a little goat who jumped over a rainbow',
  'about a rain cloud who watered a sad little flower',
  'about a family of hedgehogs getting ready for their winter sleep',
  'about a little gnome who lost his tiny hat',
  'about a bird family building their nest in the tallest tree',
  'about the friendship between the moon and a little star',
  'about a bunny who counted sheep to fall asleep',
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
  'about the last train leaving a small station at midnight',
  'about a young baker kneading bread in the quiet of early morning',
  'about two neighbors who sit on their balconies every evening and talk',
  'about an old library full of forgotten letters',
  'about a bike ride along the coast at sunset',
  "about a museum's night guard who loves the quiet among the exhibits",
  'about a girl who learned to play piano just for herself',
  'about a mountain cabin where people go to find peace',
  'about a fisherman who watches the morning mist over the lake every day',
  'about old friends reuniting after years at a familiar place',
  'about a train ride through snowy mountains just before the holidays',
  "about a young artist painting the sky from their bedroom window",
  "about a grandmother teaching her grandchild to bake an old family recipe",
  "about a small restaurant that's only open at night for the sleepless",
  'about two strangers who meet on a night train and share their stories',
  'about an old lighthouse keeper remembering his younger years at sea',
  'about a quiet mountain village where no cars ever come',
  'about a girl who writes letters she never sends',
  'about two brothers building a shared dream in an old attic',
  'about a boat ride along the coast during a summer storm that settles into calm',
  'about an old clockmaker who tells time like stories',
  'about a woman growing a garden on a city rooftop',
  'about two friends who promise to meet again at the same place in ten years',
  'about a boy who learned guitar from his grandfather',
  'about a street musician who plays only for those who stop to listen',
  'about a family who spends the last evening of the year watching stars from the roof',
  'about a girl who learned to bake bread from a stranger in a small town',
  'about an old man who feeds the birds at the same spot in the park every day',
  'about two neighboring gardens separated only by a low fence and a great friendship',
  'about the last summer before leaving for college, spent with a best friend',
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

// Rozdeli text na "vety" tak, aby ich spojenim vzniklo presne povodne znenie (vratane medzier
// a odstavcov) - potrebne pre presne mapovanie znakovych indexov medzi originalom a prekladom.
function splitSentences(text) {
  const raw = [];
  const re = /[^.!?]+[.!?]+\s*/g;
  let match;
  let lastIndex = 0;
  while ((match = re.exec(text)) !== null) {
    raw.push(match[0]);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) raw.push(text.slice(lastIndex));
  return raw.filter((part) => part.length > 0);
}

// Oddeli koncove biele znaky (vratane odstavcovych zlomov) od "jadra" vety - jadro posielame
// Claude na preklad, biele znaky si dopajame sami, aby model nemusel spolahlivo reprodukovat
// presne medzery/odriadkovania.
function splitCoreAndTrailingWs(rawSentence) {
  const trailingMatch = rawSentence.match(/\s+$/);
  const trailingWs = trailingMatch ? trailingMatch[0] : '';
  const core = trailingWs ? rawSentence.slice(0, rawSentence.length - trailingWs.length) : rawSentence;
  return { core, trailingWs };
}

// Prelozi anglicku rozpravku do slovenciny veta po vete, s volitelnym jemnejsim zarovnanim na
// urovni slov/fraz (chunks) tam, kde je priamy doslovny sulad mozny bez toho aby preklad znel
// neprirodzene. Zarovnanie sa validuje (spojenie "en" casti chunku sa musi presne zhodovat s
// povodnou vetou) - ak nesedi alebo chyba, pouzije sa cela veta ako jeden celok (fallback).
async function translateStoryToSlovak(content) {
  const rawSentences = splitSentences(content);
  const parts = rawSentences.map(splitCoreAndTrailingWs);
  if (parts.length === 0) return { sentences: [] };

  const numbered = parts.map((p, i) => `[${i}] ${p.core}`).join('\n');

  const message = await client.messages.create(
    {
      model: 'claude-sonnet-5',
      // Vystup musi obsahovat sk aj (volitelne) en/sk chunky pre kazdu vetu - typicky vyrazne
      // viac textu ako samotna rozpravka, preto vyssi limit ako pri generovani.
      max_tokens: 8000,
      system:
        'You translate a children\'s bedtime story from English to Slovak, sentence by sentence, for a bilingual family (the child listens/reads in English, while a simultaneous Slovak translation is shown side by side).\n\n' +
        'IMPORTANT: Write all Slovak text using correct, complete Slovak orthography, INCLUDING every diacritic mark (á, ä, č, ď, é, í, ĺ, ľ, ň, ó, ô, ŕ, š, ť, ú, ý, ž). Never omit or simplify accent marks - "dávno" must never become "davno", "nežne" must never become "nezne", and so on.\n\n' +
        'Below is a numbered list of English sentences (already trimmed of trailing whitespace). For EACH numbered sentence, provide a natural, fluent Slovak translation ("sk").\n\n' +
        'Additionally, ONLY when a reasonably direct word-or-short-phrase correspondence exists between the English sentence and your natural Slovak translation (similar word order/structure), ALSO break that sentence into an ordered list of aligned "chunks" ("chunks"). Each chunk\'s "en" field MUST be a contiguous piece of the EXACT given English sentence, copied character-for-character (including internal spacing/punctuation) - concatenating all "en" chunks in order must reproduce the given English sentence exactly. Each chunk\'s "sk" is the Slovak translation of just that piece.\n\n' +
        'If your natural Slovak translation is significantly reworded, reordered, or restructured compared to a literal rendering (common and expected due to grammar differences - ALWAYS prioritize a natural Slovak translation over a literal one), OMIT the "chunks" array for that sentence entirely rather than forcing an unnatural literal split.',
      tools: [
        {
          name: 'attach_sentence_translations',
          description: 'Provide Slovak translations (and optional word/phrase alignment) for each numbered English sentence.',
          input_schema: {
            type: 'object',
            properties: {
              sentences: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'integer' },
                    sk: { type: 'string', description: 'Natural, fluent Slovak translation of the whole sentence.' },
                    chunks: {
                      type: 'array',
                      description: 'Optional fine-grained alignment - only when a direct word/phrase correspondence exists.',
                      items: {
                        type: 'object',
                        properties: {
                          en: { type: 'string', description: 'Exact contiguous piece of the given English sentence.' },
                          sk: { type: 'string', description: 'Slovak translation of just this piece.' },
                        },
                        required: ['en', 'sk'],
                      },
                    },
                  },
                  required: ['index', 'sk'],
                },
              },
            },
            required: ['sentences'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'attach_sentence_translations' },
      messages: [{ role: 'user', content: numbered }],
    },
    // Preklad musi vygenerovat vyrazne viac textu ako samotna rozpravka (vety + volitelne
    // slovne/frazove zarovnanie pre kazdu z nich), preto potrebuje dlhsi limit ako generovanie.
    { timeout: 90_000 }
  );

  const toolBlock = message.content.find((block) => block.type === 'tool_use' && block.name === 'attach_sentence_translations');
  let translated = toolBlock && toolBlock.input && toolBlock.input.sentences;
  if (typeof translated === 'string') {
    try {
      translated = JSON.parse(translated);
    } catch (err) {
      translated = null;
    }
  }
  if (!Array.isArray(translated)) {
    throw new Error('Preklad sa nepodarilo spracovať (neplatná odpoveď modelu).');
  }

  const byIndex = new Map();
  translated.forEach((entry) => {
    if (entry && typeof entry.index === 'number') byIndex.set(entry.index, entry);
  });

  return {
    sentences: parts.map((p, i) => {
      const entry = byIndex.get(i);
      const sk = (entry && typeof entry.sk === 'string' && entry.sk.trim()) || p.core;
      let chunks = null;
      if (entry && Array.isArray(entry.chunks) && entry.chunks.length > 0) {
        const valid = entry.chunks.every((c) => c && typeof c.en === 'string' && typeof c.sk === 'string');
        const reconstructed = valid ? entry.chunks.map((c) => c.en).join('') : null;
        if (valid && reconstructed === p.core) {
          chunks = entry.chunks.map((c) => ({ en: c.en, sk: c.sk }));
        }
      }
      return { en: p.core, trailingWs: p.trailingWs, sk, chunks };
    }),
  };
}

// Anthropic API nezverejnuje endpoint na zistenie platnosti/expiracie kluca, takze jedinym
// sposobom overenia je skutocny (velmi maly) request - "ping" spravou s max_tokens:1.
async function checkApiKeyValidity() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { checked: false, valid: false, reason: 'missing' };
  }
  try {
    await client.messages.create(
      {
        model: 'claude-sonnet-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      },
      { timeout: 10_000 }
    );
    return { checked: true, valid: true };
  } catch (err) {
    const status = err && err.status;
    if (status === 401) {
      return { checked: true, valid: false, reason: 'unauthorized' };
    }
    if (status === 429) {
      // Kluc bol prijaty (autentifikacia prebehla), len je momentalne rate-limited/bez kreditu.
      return { checked: true, valid: true, reason: 'rate_limited' };
    }
    console.error('Chyba pri overovani platnosti API kľúča:', err);
    return { checked: true, valid: null, reason: 'unknown' };
  }
}

module.exports = { generateStory, extractSoundCues, pickSurpriseTopic, suggestBlockedTopics, translateStoryToSlovak, checkApiKeyValidity };
