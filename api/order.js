// Vercel serverless function: forwards an order from the site form to Telegram.
// Needs two environment variables in the Vercel project:
//   TELEGRAM_BOT_TOKEN — the token from @BotFather
//   TELEGRAM_CHAT_ID   — the chat that receives orders (your own id or a group id)

const LIMITS = { name: 100, contact: 150, message: 1000 };

function clean(value, max) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ ok: false, error: 'config' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // spam bots fill the hidden "website" field; pretend success and drop it
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  const name = clean(body.name, LIMITS.name);
  const contact = clean(body.contact, LIMITS.contact);
  const message = clean(body.message, LIMITS.message);
  if (!name || !contact) return res.status(400).json({ ok: false, error: 'fields' });

  const lines = ['🕯 Нова заявка з сайту STAN WOOD', '', "Ім'я: " + name, 'Контакт: ' + contact];
  if (message) lines.push('Побажання: ' + message);

  try {
    // plain text (no parse_mode), so nothing a visitor types can be read as markup
    const tg = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), disable_web_page_preview: true })
    });
    if (!tg.ok) return res.status(502).json({ ok: false, error: 'telegram' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'network' });
  }
};
