#!/bin/bash
# Connects the site's order form to your Telegram bot in one go:
# asks for the bot token, finds your chat id, saves both to Vercel,
# sends a test message and redeploys the site.
#
# Before running: create a bot in @BotFather and send your bot any message (e.g. "привіт").
set -euo pipefail
cd "$(dirname "$0")/.."

printf 'Вставте токен бота від @BotFather (його не буде видно) і натисніть Enter: '
read -rs TOKEN
echo
[ -n "$TOKEN" ] || { echo "Токен порожній."; exit 1; }

echo "Шукаю ваш чат..."
UPDATES=$(curl -fsS "https://api.telegram.org/bot${TOKEN}/getUpdates") || { echo "Telegram не прийняв токен. Перевірте, що скопіювали його повністю."; exit 1; }
CHAT_ID=$(printf '%s' "$UPDATES" | python3 -I -c 'import json,sys
r=json.load(sys.stdin).get("result",[])
ids=[(u.get("message") or u.get("my_chat_member") or {}).get("chat",{}).get("id") for u in r]
ids=[i for i in ids if i]
print(ids[-1] if ids else "")')
[ -n "$CHAT_ID" ] || { echo "Не знайшов чат. Відкрийте свого бота в Telegram, напишіть йому «привіт» і запустіть скрипт ще раз."; exit 1; }

echo "Зберігаю налаштування у Vercel..."
printf '%s' "$TOKEN" | vercel env add TELEGRAM_BOT_TOKEN production --force --sensitive >/dev/null
printf '%s' "$CHAT_ID" | vercel env add TELEGRAM_CHAT_ID production --force >/dev/null

curl -fsS "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${CHAT_ID}" \
  --data-urlencode "text=✅ Бот підключено. Сюди приходитимуть заявки з сайту STAN WOOD." >/dev/null

echo "Оновлюю сайт..."
vercel deploy --prod --yes >/dev/null
echo "Готово! Перевірте Telegram — там має бути повідомлення від бота."
