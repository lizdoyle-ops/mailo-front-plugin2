require('dotenv').config();

const Anthropic = require('@anthropic-ai/sdk');
const https     = require('https');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Use-case taxonomy (from Emeria's 6 priority use cases) ──────────────────

const USE_CASES = {
  BREAKDOWN:  { label: 'Suivi sinistre / Panne',   tag: 'Suivi sinistre'        },
  CHARGES:    { label: 'Régularisation charges',   tag: 'Régularisation charges' },
  ASSEMBLY:   { label: 'Assemblée générale',        tag: 'Assemblée générale'     },
  PROSPECT:   { label: 'Prospect entrant',          tag: 'Prospect entrant'       },
  CROSS_SELL: { label: 'Cession bien géré',         tag: 'Cession bien'           },
  RE_LETTING: { label: 'Relocation / Préavis',      tag: 'Relocation'             },
  OTHER:      { label: 'Autre demande',             tag: 'À qualifier'            },
};

const SYSTEM_PROMPT = `Tu es MAILO, l'assistant IA du Service Client Emeria (groupe Foncia), expert en gestion immobilière française.

Quand tu reçois un email client, tu dois :
1. Classer l'email dans l'un des cas d'usage prioritaires Emeria
2. Rédiger un brouillon de réponse professionnel en français

## Cas d'usage :
- BREAKDOWN   : Signalement panne ou sinistre, demande de suivi intervention ou réparation
- CHARGES     : Régularisation charges locatives, appels de fonds, explication hausse, détail des charges
- ASSEMBLY    : Organisation assemblée générale copropriété, convocation, ordre du jour, changement mandataire
- PROSPECT    : Nouveau client demandant un devis de gestion locative ou de syndic (mandat entrant)
- CROSS_SELL  : Copropriétaire ou propriétaire souhaitant vendre son bien (opportunité transaction)
- RE_LETTING  : Préavis de départ d'un locataire, remise en état, relocation à organiser
- OTHER       : Autre demande ne correspondant pas aux cas ci-dessus

## Format de réponse (JSON strict, aucun texte avant ou après) :
{
  "useCase": "BREAKDOWN|CHARGES|ASSEMBLY|PROSPECT|CROSS_SELL|RE_LETTING|OTHER",
  "reasoning": "1 phrase expliquant pourquoi ce classement",
  "urgency": "haute|normale|basse",
  "replySubject": "Re: [objet de la réponse]",
  "replyBodyHtml": "<p>Corps du brouillon HTML...</p>"
}

## Consignes pour le brouillon :
- Professionnel, empathique, rassurant
- Toujours en français, vouvoiement
- Commencer par accuser réception et valider la demande
- Donner un délai de traitement concret si pertinent
- Ne pas inventer d'informations factuelles (noms de prestataires, montants précis)
- Terminer par : "Cordialement,<br>L'équipe Emeria — Foncia Service Client"`;

// ── Claude: classify email + generate draft ──────────────────────────────────

async function classifyAndDraft({ from, fromName, subject, bodyText }) {
  const userMessage =
    `Email reçu :\nDe : ${fromName || from} <${from}>\nObjet : ${subject}\n\n${bodyText}`;

  const msg = await anthropic.messages.create({
    model:      'claude-sonnet-5',
    max_tokens: 1500,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userMessage }],
  });

  const raw   = msg.content[0].text.trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in Claude response:\n${raw}`);

  const parsed  = JSON.parse(match[0]);
  const ucMeta  = USE_CASES[parsed.useCase] || USE_CASES.OTHER;

  return {
    useCase:      parsed.useCase,
    useCaseLabel: ucMeta.label,
    tagName:      ucMeta.tag,
    urgency:      parsed.urgency || 'normale',
    reasoning:    parsed.reasoning,
    replySubject: parsed.replySubject,
    replyBodyHtml: parsed.replyBodyHtml,
  };
}

// ── OAuth token cache (client credentials for Agent → Front) ─────────────────

let _oauthCache = null; // { token, expiresAt }

async function getOAuthToken() {
  if (_oauthCache && Date.now() < _oauthCache.expiresAt) return _oauthCache.token;

  const oauthUrl    = process.env.FRONT_OAUTH_URL;
  const clientId    = process.env.FRONT_CLIENT_ID;
  const clientSecret = process.env.FRONT_CLIENT_SECRET;

  // Fall back to personal token if OAuth creds not configured
  if (!oauthUrl || !clientId || !clientSecret) {
    return process.env.FRONT_API_TOKEN;
  }

  const body = `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`;
  const url  = new URL(oauthUrl);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.access_token) {
            console.warn('[MAILO AGENT] OAuth failed, falling back to API token:', data.slice(0, 200));
            return resolve(process.env.FRONT_API_TOKEN);
          }
          _oauthCache = {
            token:     json.access_token,
            expiresAt: Date.now() + ((json.expires_in || 3600) - 60) * 1000,
          };
          console.log('[MAILO AGENT] OAuth token obtained (expires in', json.expires_in, 's)');
          resolve(_oauthCache.token);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Front REST API helpers ───────────────────────────────────────────────────

async function frontCall(method, path, body) {
  const token   = await getOAuthToken();
  const payload = body ? JSON.stringify(body) : null;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api2.frontapp.com',
      path,
      method,
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        const parsed = data ? (() => { try { return JSON.parse(data); } catch { return data; } })() : {};
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
        else reject(new Error(`Front ${method} ${path} → ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Find or create a tag by name; returns tag ID
async function resolveTag(tagName) {
  const list  = await frontCall('GET', '/tags', null);
  const tags  = list._results || list.results || [];
  const found = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
  if (found) return found.id;

  const created = await frontCall('POST', '/tags', { name: tagName });
  return created.id;
}

async function tagConversation(conversationId, tagName) {
  const tagId = await resolveTag(tagName);
  await frontCall('POST', `/conversations/${conversationId}/tags`, { tag_ids: [tagId] });
  return tagId;
}

// Create a reply draft on an existing conversation
async function createReplyDraft(conversationId, replySubject, replyBodyHtml) {
  // Fetch conversation to get inbox channel and latest message
  const conv = await frontCall('GET', `/conversations/${conversationId}`, null);
  const msgs  = await frontCall('GET', `/conversations/${conversationId}/messages`, null);
  const all   = msgs._results || msgs.results || [];
  const latest = all[all.length - 1];

  if (!latest) throw new Error('No messages in conversation');

  // Front inbox id doubles as channel id for the draft API
  const inboxId = conv._links?.related?.inboxes
    ? (await frontCall('GET', conv._links.related.inboxes, null))
        ._results?.[0]?.id
    : (conv.inboxes?.[0]?.id || process.env.FRONT_INBOX_ID);

  if (!inboxId) throw new Error('Cannot resolve inbox/channel for conversation');

  const draft = await frontCall('POST', `/channels/${inboxId}/drafts`, {
    to:      [latest.from?.handle].filter(Boolean),
    subject: replySubject,
    body:    replyBodyHtml,
    type:    'reply',
    reply_options: {
      type:                 'reply',
      original_message_uid: latest.id,
    },
  });

  return draft;
}

// ── Main agent entry point ───────────────────────────────────────────────────

async function runAgent(conversationId, emailData) {
  const log = (...a) => console.log('[MAILO AGENT]', ...a);

  log(`▶ Processing conversation ${conversationId || '(no id — dry run)'}`);
  log(`  From: ${emailData.fromName || emailData.from} | Subject: ${emailData.subject}`);

  // 1. Classify + draft
  const result = await classifyAndDraft(emailData);
  log(`  ✦ Use case : ${result.useCase} — ${result.useCaseLabel}`);
  log(`  ✦ Urgency  : ${result.urgency}`);
  log(`  ✦ Reason   : ${result.reasoning}`);

  if (!conversationId) {
    log('  ⚠ No conversation ID — skipping Front API calls (dry run)');
    return { ...result, dryRun: true };
  }

  // 2. Tag conversation
  let tagId = null;
  try {
    tagId = await tagConversation(conversationId, result.tagName);
    log(`  ✅ Tagged: "${result.tagName}" (${tagId})`);
  } catch (err) {
    log(`  ❌ Tagging failed: ${err.message}`);
  }

  // 3. Create reply draft
  let draftId = null;
  try {
    const draft = await createReplyDraft(conversationId, result.replySubject, result.replyBodyHtml);
    draftId = draft.id;
    log(`  ✅ Draft created: ${draftId}`);
  } catch (err) {
    log(`  ❌ Draft creation failed: ${err.message}`);
  }

  return { ...result, tagId, draftId };
}

module.exports = { runAgent, classifyAndDraft };
