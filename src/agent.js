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
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 800,
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

async function frontCall(method, path, body, useOAuth = false) {
  const token = useOAuth ? await getOAuthToken() : process.env.FRONT_API_TOKEN;
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

// Tag ID cache — avoids listing 8000+ tags on every call
const _tagCache = {}; // name → id

// Channel ID cache — inbox id → channel id (resolved once, reused forever)
const _channelCache = {}; // inboxId → channelId

async function resolveTag(tagName) {
  const key = tagName.toLowerCase();
  if (_tagCache[key]) return _tagCache[key];

  // Search by name instead of listing everything
  const list  = await frontCall('GET', `/tags?limit=5&q=${encodeURIComponent(tagName)}`, null);
  const tags  = list._results || list.results || [];
  const found = tags.find(t => t.name.toLowerCase() === key);
  if (found) {
    _tagCache[key] = found.id;
    return found.id;
  }

  const created = await frontCall('POST', '/tags', { name: tagName });
  _tagCache[key] = created.id;
  return created.id;
}

async function tagConversation(conversationId, tagName) {
  const tagId = await resolveTag(tagName);
  await frontCall('POST', `/conversations/${conversationId}/tags`, { tag_ids: [tagId] });
  return tagId;
}

// Resolve channel ID for an inbox — cached after first lookup
async function resolveChannelId(inboxId) {
  if (_channelCache[inboxId]) return _channelCache[inboxId];
  const channels = await frontCall('GET', `/inboxes/${inboxId}/channels`, null);
  _channelCache[inboxId] = channels._results?.[0]?.id;
  return _channelCache[inboxId];
}

// Create a reply draft on a conversation
async function createReplyDraft(conversationId, replySubject, replyBodyHtml, authorId) {
  const inboxes   = await frontCall('GET', `/conversations/${conversationId}/inboxes`, null);
  const inboxId   = inboxes._results?.[0]?.id;
  const channelId = await resolveChannelId(inboxId);

  const body = {
    channel_id: channelId,
    body:       replyBodyHtml,
    subject:    replySubject,
    type:       'reply',
    draft_mode: 'shared',
  };
  if (authorId) body.author_id = authorId;

  return frontCall('POST', `/conversations/${conversationId}/drafts`, body);
}

// ── Main agent entry point ───────────────────────────────────────────────────

async function runAgent(conversationId, emailData, teammateId) {
  const log = (...a) => console.log('[MAILO AGENT]', ...a);

  log(`▶ Processing conversation ${conversationId || '(no id — dry run)'} | author: ${teammateId || 'api_token'}`);

  // Fetch conversation + messages in parallel when not provided by caller
  if (!emailData && conversationId) {
    const [conv, msgs] = await Promise.all([
      frontCall('GET', `/conversations/${conversationId}`, null),
      frontCall('GET', `/conversations/${conversationId}/messages`, null),
    ]);
    const all    = msgs._results || msgs.results || [];
    const latest = all.find(m => m.type !== 'system') || all[0];
    if (!latest) { log('No messages found'); return; }

    emailData = {
      from:     latest.from?.handle || '',
      fromName: latest.from?.name   || '',
      subject:  conv.subject || '',
      bodyText: latest.text  || latest.body || '',
    };
  }

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

  // 2. Create reply draft
  let draftId = null;
  try {
    const draft = await createReplyDraft(conversationId, result.replySubject, result.replyBodyHtml, teammateId);
    draftId = draft.id;
    log(`  ✅ Draft created: ${draftId}`);
  } catch (err) {
    log(`  ❌ Draft creation failed: ${err.message}`);
  }

  return { ...result, draftId };
}

module.exports = { runAgent, classifyAndDraft };
