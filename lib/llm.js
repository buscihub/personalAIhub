import 'server-only';

// Unico punto che parla con Anthropic. Niente ragionamento esteso (parametro `thinking` mai passato).
const DEFAULT_MODEL = 'claude-haiku-5-5';

export const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY);
export const modelName = () => process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

// Concatena TUTTI i blocchi di testo, scartando ragionamento e altro.
function textOf(content) {
  return (content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

export async function ask({ system, user, maxTokens = 3000, model = modelName(), timeoutMs = 20000 }) {
  if (!hasKey()) throw new Error('ANTHROPIC_API_KEY mancante');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (data.stop_reason === 'max_tokens') console.warn('[llm] risposta troncata: stop_reason=max_tokens');
  return textOf(data.content);
}

// Estrae l'oggetto JSON tra la prima graffa aperta e l'ultima chiusa: il modello a volte aggiunge cortesie.
export function extractJson(text) {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a === -1 || b <= a) throw new Error('nessun JSON nella risposta');
  return JSON.parse(text.slice(a, b + 1));
}

export async function askJson(opts) {
  return extractJson(await ask(opts));
}
