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

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es MAILO, l'assistant IA du Service Client Emeria (groupe Foncia), expert en gestion immobilière française.

Quand tu reçois un ID de conversation Front, tu dois :
1. Appeler read_conversation pour lire l'email entrant
2. Classer l'email dans l'un des cas d'usage prioritaires Emeria
3. Rédiger un brouillon de réponse professionnel en français
4. Appeler create_draft pour créer le brouillon — OBLIGATOIRE: passer shared=true

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

async function runAgent(conversationId, _unused, teammateId) {
  const log = (...a) => console.log('[MAILO AGENT]', ...a);
  log(`▶ conversation=${conversationId} | author=${teammateId || 'mcp_user'}`);

  const mcpToken = await getMcpToken();
  log('  ✓ MCP token obtained');

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
        content: `Traite la conversation Front : ${conversationId}. Lis l'email avec read_conversation, classe-le, rédige un brouillon en français, puis crée-le avec create_draft. IMPORTANT: tu dois TOUJOURS passer shared=true à create_draft sinon le brouillon sera invisible pour l'équipe.`,
      },
    ],
  });

  log(`  stop_reason: ${response.stop_reason}`);

  for (const block of response.content) {
    if (block.type === 'text') {
      log('  ✓', block.text.slice(0, 200));
    } else if (block.type === 'tool_use') {
      log(`  → MCP tool: ${block.name}`);
    }
  }
}

module.exports = { runAgent };
