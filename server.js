require('dotenv').config();

const { buildSync } = require('esbuild');
const express = require('express');
const https   = require('https');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

// Ensure public directory exists
if (!fs.existsSync('public')) fs.mkdirSync('public');

// Bundle Front SDK + init logic
console.log('📦 Bundling Front SDK…');
try {
  buildSync({
    entryPoints: ['src/sdk-init.js'],
    bundle: true,
    outfile: 'public/bundle.js',
    format: 'iife',
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'error',
  });
  console.log('✅ Bundle ready → public/bundle.js');
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
}

// ── Seed email definitions ───────────────────────────────────────────────────

function getSeedEmails() {
  const ts = Math.floor(Date.now() / 1000);
  return [
    {
      from:     'leyton@finalproduction.club',
      fromName: 'Leyton Bernard',
      subject:  'Panne chaudière collective — Intervention urgente requise',
      body: `<p>Bonjour,</p>
<p>Je me permets de vous contacter en urgence concernant une panne de la chaudière collective au sein de la résidence <strong>RES LES AMANDIERS</strong>.</p>
<p>La panne est survenue hier soir vers 21h. Plusieurs locataires se retrouvent sans chauffage ni eau chaude, situation particulièrement difficile pour les familles avec jeunes enfants.</p>
<p>Pourriez-vous :</p>
<ul>
  <li>Contacter le prestataire de maintenance en urgence ?</li>
  <li>M'informer du délai d'intervention prévisible ?</li>
  <li>Prévoir une solution de chauffage temporaire si l'intervention dépasse 48h ?</li>
</ul>
<p>Dans l'attente de votre retour rapide,</p>
<p>Cordialement,<br/>Leyton Bernard</p>`,
      externalId: `mailo-seed-leyton-${ts}-${crypto.randomBytes(4).toString('hex')}`,
    },
    {
      from:     'sarah@zestymedia.club',
      fromName: 'Sarah Vidal',
      subject:  'Demande de détail charges locatives et appels de fonds 2025',
      body: `<p>Madame, Monsieur,</p>
<p>Je me permets de vous contacter afin d'obtenir des précisions concernant mes charges locatives pour l'exercice 2025 ainsi que les prochains appels de fonds pour le bien <strong>APPT 42 RUE DU COMMERCE</strong>.</p>
<p>Plus précisément, je souhaiterais :</p>
<ul>
  <li>Un détail des charges récupérables pour l'exercice 2024 (régularisation en cours)</li>
  <li>Le calendrier prévisionnel des appels de fonds Q1–Q2 2025</li>
  <li>Une explication sur l'augmentation de 12 % constatée sur mon dernier relevé</li>
</ul>
<p>Pourriez-vous me transmettre ces informations dans les meilleurs délais ?</p>
<p>Merci par avance pour votre retour.</p>
<p>Cordialement,<br/>Sarah Vidal</p>`,
      externalId: `mailo-seed-sarah-${ts}-${crypto.randomBytes(4).toString('hex')}`,
    },
    {
      from:     'elias@auditlawyer.club',
      fromName: 'Elias Moreau',
      subject:  'Transmission documents — Changement mandataire syndic',
      body: `<p>Bonjour,</p>
<p>Suite au changement de mandataire intervenu lors de la dernière assemblée générale de la <strong>SDC TOUR BELLEVUE</strong>, je vous adresse les documents nécessaires à la mise à jour administrative du dossier.</p>
<p>Vous trouverez ci-joint :</p>
<ul>
  <li>Le procès-verbal de l'assemblée générale (03/01/2025)</li>
  <li>Le mandat de gestion signé par le nouveau mandataire</li>
  <li>La liste actualisée des copropriétaires</li>
  <li>Les coordonnées bancaires mises à jour (RIB)</li>
</ul>
<p>Pourriez-vous confirmer la bonne réception de ces documents et me communiquer le délai de traitement prévu ?</p>
<p>Dans l'attente de votre confirmation,</p>
<p>Cordialement,<br/>Elias Moreau<br/>Audit Lawyer Club</p>`,
      externalId: `mailo-seed-elias-${ts}-${crypto.randomBytes(4).toString('hex')}`,
    },
  ];
}

// ── Front Import API helper ──────────────────────────────────────────────────

function frontGet(token, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api2.frontapp.com',
      path,
      method:  'GET',
      headers: { Authorization: `Bearer ${token}` },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
        else reject(new Error(`GET ${path} → ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function importMessage(token, inboxId, inboxAddress, msg) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender:      { handle: msg.from, name: msg.fromName },
      to:          inboxAddress ? [inboxAddress] : [],
      subject:     msg.subject,
      body:        msg.body,
      body_format: 'html',
      external_id: msg.externalId,
      created_at:  Math.floor(Date.now() / 1000),
      metadata:    { is_inbound: true, is_archived: false, should_skip_rules: false },
    });

    const options = {
      hostname: 'api2.frontapp.com',
      path:     `/inboxes/${inboxId}/imported_messages`,
      method:   'POST',
      headers:  {
        'Authorization':  `Bearer ${token}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } else {
          reject(new Error(`Front API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Express app ──────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/seed  — imports the 3 test emails via Front Import API
app.post('/api/seed', async (req, res) => {
  const token = process.env.FRONT_API_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'FRONT_API_TOKEN not set. Add it to your .env file (see .env.example).',
    });
  }

  const inboxId = req.body.inboxId || process.env.FRONT_INBOX_ID;
  if (!inboxId) {
    return res.status(400).json({
      error: 'No inbox ID available. Open a conversation in Front first, or set FRONT_INBOX_ID in .env.',
    });
  }

  // Resolve inbox email address so `to` is populated correctly.
  // For custom inboxes the address field is an internal token (not a valid email
  // handle), so we fall back to a plain placeholder that Front accepts.
  let inboxAddress = process.env.FRONT_TO_ADDRESS || null;
  if (!inboxAddress) {
    try {
      const inbox = await frontGet(token, `/inboxes/${inboxId}`);
      const raw = inbox.address || '';
      // Only use the address if it looks like a real email
      inboxAddress = raw.includes('@') ? raw : 'emeria-care@foncia.fr';
      console.log(`  📬  to: ${inboxAddress}`);
    } catch (err) {
      inboxAddress = 'emeria-care@foncia.fr';
      console.warn('  ⚠️  Could not fetch inbox address, using fallback:', inboxAddress);
    }
  }

  const emails  = getSeedEmails();
  const results = [];

  for (const email of emails) {
    try {
      const result = await importMessage(token, inboxId, inboxAddress, email);
      results.push({ success: true, from: email.from, subject: email.subject, status: result.status });
      console.log(`  ✅  ${email.from} → ${email.subject}`);
    } catch (err) {
      results.push({ success: false, from: email.from, subject: email.subject, error: err.message });
      console.error(`  ❌  ${email.from}: ${err.message}`);
    }
  }

  const ok = results.filter((r) => r.success).length;
  console.log(`\n📨 Seed complete: ${ok}/${emails.length} imported into inbox ${inboxId}\n`);
  res.json({ inboxId, results });
});

app.listen(PORT, () => {
  const tokenSet = !!process.env.FRONT_API_TOKEN;
  console.log(`
╔════════════════════════════════════════════════════════╗
║           MAILO — Front Plugin Server                  ║
╠════════════════════════════════════════════════════════╣
║  Local:   http://localhost:${PORT}                        ║
║  Token:   ${tokenSet ? '✅ FRONT_API_TOKEN set' : '⚠️  FRONT_API_TOKEN missing (.env)'}         ║
╠════════════════════════════════════════════════════════╣
║  NEXT STEPS                                            ║
║  1. Open a new terminal and run:                       ║
║       ngrok http ${PORT}                                  ║
║  2. Copy the HTTPS URL (e.g. https://xxxx.ngrok.io)    ║
║  3. In Front → Settings → Integrations →               ║
║       Custom plugin → paste the URL                   ║
╚════════════════════════════════════════════════════════╝
`);
});
