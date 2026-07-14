/**
 * Lista as vozes disponíveis na conta do ElevenLabs, para escolher qual narra as
 * aulas. Copie o ID da voz escolhida para ELEVENLABS_VOICE_ID no .env.
 *
 *   cd server && node scripts/vozesElevenlabs.js
 *
 * Dica: uma voz treinada em português do Brasil soa muito melhor que uma voz
 * inglesa falando português. Procure por vozes pt-BR na Voice Library do
 * ElevenLabs e adicione-as à conta antes de rodar este script.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

async function main() {
  const chave = process.env.ELEVENLABS_API_KEY;
  if (!chave) {
    console.error('ELEVENLABS_API_KEY ausente no .env.');
    process.exit(1);
  }

  const r = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': chave },
    signal: AbortSignal.timeout(30000),
  });

  if (!r.ok) {
    console.error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
    process.exit(1);
  }

  const { voices = [] } = await r.json();
  if (!voices.length) {
    console.log('Nenhuma voz na conta. Adicione vozes pela Voice Library do ElevenLabs.');
    return;
  }

  console.log(`\n${voices.length} voz(es) na conta:\n`);
  for (const v of voices) {
    const rotulos = Object.values(v.labels || {}).filter(Boolean).join(', ');
    console.log(`  ${v.voice_id}   ${v.name}${rotulos ? `  (${rotulos})` : ''}`);
    if (v.preview_url) console.log(`  ${' '.repeat(v.voice_id.length)}   ouvir: ${v.preview_url}`);
  }
  console.log('\nCopie o ID desejado para ELEVENLABS_VOICE_ID no .env.\n');
}

main().catch((e) => {
  console.error('Falha ao listar vozes:', e.message);
  process.exit(1);
});
