const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt({ allowedTopics, blockedTopics, moralLesson, minLength, maxLength }) {
  const lines = [
    'Si láskavý rozprávač, ktorý píše krátke upokojujúce rozprávky na dobrú noc pre malé deti v slovenčine.',
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

  lines.push('Odpovedz iba samotným textom rozprávky, bez nadpisu a bez akéhokoľvek komentára navyše.');

  return lines.join('\n');
}

async function generateStory({ childPrompt, allowedTopics, blockedTopics, moralLesson, minLength, maxLength }) {
  const system = buildSystemPrompt({ allowedTopics, blockedTopics, moralLesson, minLength, maxLength });
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
