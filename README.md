# KING-V5 WhatsApp Bot — starter project

This is a starter codebase, not a deployed or fully featured bot yet.

## Included starter commands
- `menu`, `.menu`, `.help`
- `.ping`, `.alive`
- Group welcome messages
- Basic in-memory message cache and a best-effort deleted-message event handler

## Not enabled yet
- Sticker conversion
- Media downloads
- AI responses
These need extra modules/providers and, for AI, an API key. Don't paste secret keys into public repositories.

## Important limitations
- This uses the community-maintained Baileys library, which is not an official WhatsApp product. Unofficial automation may stop working or risk the linked account. Use a spare account and do not use it for spam or bulk unsolicited messages.
- Anti-delete is best-effort only: it cannot recover every message, especially if the bot was offline or the WhatsApp client does not send a revoke event. Tell group members if messages are being logged.
- A free Render web service is not suitable for guaranteed 24/7 uptime; it can spin down when idle. A paid always-on VPS or hosting service is needed for reliable continuous operation.
- Keep `auth_info/` private. It contains login credentials. Never upload it to GitHub or send it to anyone.

## Run locally
1. Install Node.js 20 or newer on a computer/server.
2. Extract this project.
3. Run `npm install`.
4. Run `npm start`.
5. In WhatsApp on your phone, open **Settings → Linked devices → Link a device** and scan the QR displayed in the terminal.
6. Keep the process running. For a server, use a process manager such as PM2.

## Hosting
For always-on hosting, deploy to a VPS or paid service that supports long-running Node.js processes and persistent storage. Make sure the `auth_info/` directory persists across restarts. Do not deploy to ephemeral storage without a safe way to restore pairing.

## Next development steps
1. Test pairing and `.menu` / `.ping`.
2. Add image download + WebP sticker conversion.
3. Add an AI provider through environment variables.
4. Add a trusted media provider for downloads.
5. Configure persistent hosting, monitoring, and backups.
