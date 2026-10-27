// "È una domanda?": punto interrogativo finale oppure parola interrogativa iniziale.
const WORDS = /^(chi|cosa|che|come|quando|dove|perché|perche|quanto|quanta|quanti|quante|quale|quali|c'è|ho|sono|devo)\b/i;
export function isQuestion(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  return t.endsWith('?') || (WORDS.test(t) && /^(chi|cosa|che|come|quando|dove|perch|quant|qual)/i.test(t));
}
