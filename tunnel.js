const ngrok = require('@ngrok/ngrok');

const AUTHTOKEN = '3Bi0lOvf0DFfn3TYrN6OrHDuaUk_4TVxedwFL7DQe6QXGGF62';

(async () => {
  try {
    const listener = await ngrok.forward({
      addr:      3000,
      authtoken: AUTHTOKEN,
    });

    const url = listener.url();

    console.log(`
╔══════════════════════════════════════════════════════╗
║  ✅  MAILO Plugin tunnel live!                       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  ${url.padEnd(52)}║
║                                                      ║
║  → Paste this URL into Front:                        ║
║    Settings → Integrations → Custom plugin           ║
║                                                      ║
║  Keep this terminal open. Ctrl+C to stop.            ║
╚══════════════════════════════════════════════════════╝
`);

    // Keep the process alive (works in any environment, not just TTY)
    setInterval(() => {}, 1 << 30);

  } catch (err) {
    console.error('❌ Tunnel failed:', err.message);
    process.exit(1);
  }
})();
