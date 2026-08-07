const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt({ allowedTopics, blockedTopics, moralLesson, minLength, maxLength, girlNames, boyNames, adultNames, language }) {
  const isEnglish = language === 'en';
  const lines = [
    'Si láskavý rozprávač, ktorý píše krátke upokojujúce rozprávky na dobrú noc pre malé deti.',
    isEnglish
      ? 'IMPORTANT: Write the entire story in English, regardless of the language of these instructions.'
      : 'DÔLEŽITÉ: Celú rozprávku napíš v slovenčine.',
    'Rozprávka musí byť primeraná veku, nesmie obsahovať nič strašidelné, násilné ani úzkostné - má dieťa upokojiť pred spaním.',
    `Dĺžka: približne ${minLength}-${maxLength} slov, jednoduchý jazyk, príjemný a pomalý záver, ktorý navodzuje spánok.`,
  ];

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

async function generateStory({ childPrompt, allowedTopics, blockedTopics, moralLesson, minLength, maxLength, girlNames, boyNames, adultNames, language }) {
  const system = buildSystemPrompt({ allowedTopics, blockedTopics, moralLesson, minLength, maxLength, girlNames, boyNames, adultNames, language });
  const maxTokens = Math.min(4000, Math.max(300, Math.round(maxLength * 4)));

  const message = await client.messages.create(
    {
      model: 'claude-sonnet-5',
      max_tokens: maxTokens,
      system,
      messages: [
        {
          role: 'user',
          content: `Dieťa chce počuť rozprávku na tému: ${childPrompt}`,
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

module.exports = { generateStory };
