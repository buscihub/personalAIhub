import 'server-only';

const api = (method) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_USER_ID);

async function call(method, body) {
  const res = await fetch(api(method), {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) console.warn(`[telegram] ${method} ${res.status}`);
  return res.ok;
}

export const sendMessage = (chat_id, text, reply_markup) => call('sendMessage', { chat_id, text, ...(reply_markup ? { reply_markup } : {}) });
export const answerCallbackQuery = (id, text) => call('answerCallbackQuery', { callback_query_id: id, ...(text ? { text } : {}) });
export const editMessageText = (chat_id, message_id, text, reply_markup) =>
  call('editMessageText', { chat_id, message_id, text, ...(reply_markup ? { reply_markup } : {}) });
