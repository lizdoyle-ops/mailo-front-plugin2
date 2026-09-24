require('dotenv').config();

const Anthropic = require('@anthropic-ai/sdk');
const https     = require('https');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── MCP OAuth token cache ────────────────────────────────────────────────────

let _mcpTokenCache = null; // { token, expiresAt }

async function getMcpToken() {
  if (_mcpTokenCache && Date.now() < _mcpTokenCache.expiresAt) {
    return _mcpTokenCache.token;
  }

  const body = [
    'grant_type=refresh_token',
    `client_id=${encodeURIComponent(process.env.FRONT_MCP_CLIENT_ID)}`,
    `client_secret=${encodeURIComponent(process.env.FRONT_MCP_CLIENT_SECRET)}`,
    `refresh_token=${encodeURIComponent(process.env.FRONT_MCP_REFRESH_TOKEN)}`,
  ].join('&');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'app.frontapp.com',
      path:     '/oauth/token',
      method:   'POST',
      headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        const json = JSON.parse(data);
        if (!json.access_token) return reject(new Error(`MCP token refresh failed: ${data}`));
        _mcpTokenCache = {
          token:     json.access_token,
          expiresAt: Date.now() + ((json.expires_in || 900) - 30) * 1000,
        };
        resolve(_mcpTokenCache.token);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── REST API: create draft as Reemia ─────────────────────────────────────────

const REEMIA_TEAMMATE_ID = 'tea_3pcgd';

function createDraftViaRest(conversationId, bodyHtml) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      author_id:   REEMIA_TEAMMATE_ID,
      body:        bodyHtml,
      body_format: 'html',
      mode:        'shared',
    });
    const req = https.request({
      hostname: 'api2.frontapp.com',
      path:     `/conversations/${conversationId}/drafts`,
      method:   'POST',
      headers:  {
        'Authorization': `Bearer ${process.env.FRONT_API_TOKEN}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`create_draft REST failed ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es MAILO, l'assistant IA du Service Client Emeria (groupe Foncia), expert en gestion immobilière française.

Quand tu reçois un ID de conversation Front, tu dois :
1. Appeler read_conversation pour lire l'email entrant
2. Classer l'email dans l'un des cas d'usage prioritaires Emeria
3. Rédiger un brouillon de réponse professionnel en français
4. Retourner un objet JSON UNIQUEMENT avec cette structure exacte (sans markdown, sans texte avant ou après) :
{"category":"<CATÉGORIE>","draft":"<BROUILLON EN HTML>"}

NE PAS appeler create_draft — le système s'en charge séparément.

## Cas d'usage :
- BREAKDOWN   : Signalement panne ou sinistre, demande de suivi intervention ou réparation
- CHARGES     : Régularisation charges locatives, appels de fonds, explication hausse
- ASSEMBLY    : Organisation assemblée générale copropriété, convocation, ordre du jour
- PROSPECT    : Nouveau client demandant un devis de gestion locative ou de syndic
- CROSS_SELL  : Copropriétaire souhaitant vendre son bien (opportunité transaction)
- RE_LETTING  : Préavis de départ d'un locataire, remise en état, relocation
- OTHER       : Autre demande

## Consignes pour le brouillon :
- Professionnel, empathique, rassurant
- Toujours en français, vouvoiement
- Accuser réception et valider la demande
- Donner un délai de traitement concret si pertinent
- Ne pas inventer d'informations factuelles
- Terminer par : "Cordialement,<br>L'équipe Emeria — Foncia Service Client"`;

// ── Agentic loop via Front MCP ───────────────────────────────────────────────

async function runAgent(conversationId, _unused, _teammateId) {
  const t0  = Date.now();
  const ms  = () => `+${Date.now() - t0}ms`;
  const log = (...a) => console.log('[MAILO AGENT]', ...a);

  log(`▶ conversation=${conversationId} | author=reemia (${REEMIA_TEAMMATE_ID})`);

  const mcpToken = await getMcpToken();
  log(`  ✓ MCP token ${ms()}`);

  const response = await anthropic.beta.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    betas:      ['mcp-client-2025-04-04'],
    mcp_servers: [
      {
        type:                'url',
        url:                 'https://mcp.frontapp.com/mcp',
        name:                'front',
        authorization_token: mcpToken,
      },
    ],
    system:   SYSTEM_PROMPT,
    messages: [
      {
        role:    'user',
        content: `Traite la conversation Front : ${conversationId}. Lis l'email avec read_conversation, classe-le, et retourne un JSON {"category":"...","draft":"..."} avec le brouillon en HTML. NE PAS appeler create_draft.`,
      },
    ],
  });

  log(`  ✓ Claude done (${response.stop_reason}) ${ms()}`);

  const tools = response.content.filter(b => b.type === 'tool_use').map(b => b.name);
  if (tools.length) log(`  → MCP tools called: ${tools.join(', ')}`);

  const text = response.content.find(b => b.type === 'text')?.text?.trim() || '';

  // Parse JSON from Claude's response
  let category = 'OTHER';
  let draftBody = '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const parsed = JSON.parse(jsonMatch[0]);
    category  = parsed.category || 'OTHER';
    draftBody = parsed.draft    || '';
  } catch (err) {
    log(`  ⚠ JSON parse error: ${err.message} — raw: ${text.slice(0, 200)}`);
  }

  log(`  ✓ category=${category} ${ms()}`);

  if (!draftBody) {
    log('  ⚠ No draft body extracted, skipping create');
    return;
  }

  // Create draft via REST as Reemia
  const draft = await createDraftViaRest(conversationId, draftBody);
  log(`  ✓ Draft created (REST) id=${draft.id} author=reemia ${ms()}`);
  log(`  ✅ Total: ${ms()}`);
}

module.exports = { runAgent };
