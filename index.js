import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import fs from 'node:fs';

const BOT_NAME = 'KING-V5';
const PREFIX = '.';
const deletedMessages = new Map();
const logger = pino({ level: 'silent' });

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: [BOT_NAME, 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\\nScan this QR in WhatsApp > Linked devices > Link a device:\\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} is connected.`);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnect:', shouldReconnect);
      if (shouldReconnect) startBot();
      else console.log('Logged out. Delete auth_info and pair again only if you intend to reconnect.');
    }
  });

  // Keep a short-lived local cache to support the opt-in anti-delete command.
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const chat = msg.key.remoteJid;
      const id = msg.key.id;
      deletedMessages.set(`${chat}:${id}`, msg);
      setTimeout(() => deletedMessages.delete(`${chat}:${id}`), 10 * 60 * 1000);

      const text = getText(msg).trim();
      if (!text) continue;
      const isGroup = chat.endsWith('@g.us');
      const sender = msg.key.participant || chat;

      if (text.toLowerCase() === 'menu' || text === `${PREFIX}menu` || text === `${PREFIX}help`) {
        await reply(sock, msg, `👑 *${BOT_NAME} MENU*\\n\\n` +
          `${PREFIX}ping — Check bot status\\n` +
          `${PREFIX}sticker — Reply to an image to make a sticker (image support needs setup)\\n` +
          `${PREFIX}ai <question> — AI reply (needs an AI API key)\\n` +
          `${PREFIX}alive — Check if bot is online\\n\\n` +
          `Media downloads: add a trusted downloader/API provider before enabling.\\n` +
          `Anti-delete: cached messages can only be reported if the delete event is received while online.\\n\\n` +
          `⚠️ Use responsibly; don't spam or share private messages without consent.`);
        continue;
      }
      if (text === `${PREFIX}ping` || text === `${PREFIX}alive`) {
        await reply(sock, msg, `✅ ${BOT_NAME} is online.`);
        continue;
      }
      if (text.startsWith(`${PREFIX}ai `)) {
        await reply(sock, msg, '🤖 AI is not connected yet. Add an AI provider API key and configure the AI handler before using this command.');
        continue;
      }
      if (text === `${PREFIX}sticker`) {
        await reply(sock, msg, '🖼️ Reply to an image with .sticker. Sticker conversion is not enabled in this starter yet; it needs an image-processing module.');
        continue;
      }
      if (text.startsWith(`${PREFIX}get `) || text.startsWith(`${PREFIX}play `)) {
        await reply(sock, msg, '⬇️ Downloads are not enabled yet. Configure a legitimate media provider and respect copyright and the platform’s rules.');
        continue;
      }
    }
  });

  // Group welcome messages.
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (action !== 'add') return;
    for (const participant of participants) {
      try {
        await sock.sendMessage(id, {
          text: `👋 Welcome @${participant.split('@')[0]} to the group!\\nI'm *${BOT_NAME}*. Type *menu* to see commands.`,
          mentions: [participant]
        });
      } catch (e) {
        console.error('Welcome message failed:', e?.message || e);
      }
    }
  });

  // Some WhatsApp client versions emit message-revoke events. This handler
  // only reports a cached message if that event is actually delivered.
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const key = update.key;
      if (!key?.remoteJid || !key?.id) continue;
      const cached = deletedMessages.get(`${key.remoteJid}:${key.id}`);
      if (cached && update.update?.message === null) {
        const original = getText(cached) || '[Media or non-text message]';
        try {
          await sock.sendMessage(key.remoteJid, {
            text: `🗑️ A message was deleted (cached while KING-V5 was online):\\n${original}`
          });
        } catch {}
      }
    }
  });
}

function getText(msg) {
  const m = msg.message || {};
  return m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    '';
}

async function reply(sock, msg, text) {
  await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

startBot().catch(err => {
  console.error('KING-V5 failed to start:', err);
  process.exit(1);
});
