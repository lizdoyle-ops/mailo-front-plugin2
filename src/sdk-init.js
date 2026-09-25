import Front from '@frontapp/plugin-sdk';

// ── Mock data keyed by contact email ────────────────────────────────────────

const MOCK_BY_EMAIL = {
  'leyton@finalproduction.club': {
    contact: {
      name:            'Leyton Barnes',
      role:            'Client · Final Production Club',
      tags:            ['Co-ownership', 'Urgent maintenance'],
      property:        'RES LES AMANDIERS',
      milleniumLinked: true,
    },
    conversation: {
      subject: 'Collective boiler breakdown — Urgent intervention required',
      date:    new Date().toLocaleDateString('en-GB'),
      preview: 'The collective boiler broke down last night. Several tenants are without heating or hot water.',
    },
    alerts: [
      { level: 'red',    text: 'Boiler failure — urgent intervention required' },
      { level: 'orange', text: 'Multiple tenants affected (heating / hot water)' },
      { level: 'yellow', text: 'Maintenance contractor notified — awaiting response' },
    ],
    properties: [
      {
        name:   'RES LES AMANDIERS',
        type:   'Co-ownership',
        detail: '18 units · Manager: Ms Dupuis',
        tags: [
          { label: 'Co-ownership',       color: 'blue' },
          { label: 'Urgent maintenance', color: 'red'  },
        ],
      },
    ],
    aiMessage:
      "I've analysed Leyton Barnes's email regarding the **collective boiler failure** (RES LES AMANDIERS).\n\n" +
      "⚠️ Urgent situation: several tenants have been without heating or hot water since last night.\n\n" +
      "I recommend acknowledging receipt immediately, confirming a work order has been opened, and indicating the expected response time.\n\n" +
      "Would you like me to generate the reply draft?",
    replyContent: {
      intro:  "We have received your report regarding the collective boiler failure at <strong>RES LES AMANDIERS</strong> and understand the urgency of the situation.",
      points: [
        "A work order has been immediately raised with our approved maintenance contractor",
        "A technical intervention is scheduled within <strong>24 hours</strong>",
        "Your property manager Ms Dupuis is overseeing your case",
        "A tracking reference will be provided once the intervention is confirmed",
      ],
      closing: "We will keep you informed of progress by email. We apologise for the inconvenience.",
    },
    relatedRecords: {
      factures:      [
        { label: 'Q3 2025 service charges — RES LES AMANDIERS', status: 'Paid',    date: '01/10/2025' },
        { label: 'Emergency boiler call-out',                   status: 'Pending',  date: '15/01/2026' },
      ],
      ordresTravail: [
        { label: 'WO-1289 — Water leak · 24 Rue de la Paix, Apt 5B', status: 'Repaired', date: '07/09/2026' },
      ],
      devis:         [
        { label: 'Boiler replacement Frisquet — #2026-089', status: 'Proposed', date: '16/01/2026' },
      ],
      casDeSoutien:  [
        { label: 'Ticket #4521 — Collective boiler failure', status: 'Open', date: '15/01/2026' },
      ],
      contrats:      [
        { label: 'Co-ownership contract 2025 — RES LES AMANDIERS', status: 'Active', date: '01/01/2025' },
      ],
    },
  },

  'sarah@zestymedia.club': {
    contact: {
      name:            'Sarah Vidal',
      role:            'Client · Zesty Media',
      tags:            ['Rental management', 'Financial query'],
      property:        'APPT 42 RUE DU COMMERCE',
      milleniumLinked: true,
    },
    conversation: {
      subject: 'Request for service charge details and fund calls 2025',
      date:    new Date().toLocaleDateString('en-GB'),
      preview: "I would like to obtain the breakdown of recoverable charges for the 2025 financial year as well as the upcoming fund calls.",
    },
    alerts: [
      { level: 'orange', text: 'Q1 2025 fund call — awaiting response' },
      { level: 'yellow', text: '2024 service charge reconciliation — case in progress' },
    ],
    properties: [
      {
        name:   'APPT 42 RUE DU COMMERCE',
        type:   'Rental management',
        detail: 'Lease in progress · Manager: Mr Lambert',
        tags: [
          { label: 'Active tenant',     color: 'green'  },
          { label: 'Fund call pending', color: 'orange' },
        ],
      },
    ],
    aiMessage:
      "I've analysed Sarah Vidal's request regarding **service charges and fund calls** (APPT 42 RUE DU COMMERCE).\n\n" +
      "She is asking for:\n• Breakdown of recoverable charges for 2024\n• Schedule of Q1–Q2 2025 fund calls\n• Explanation for the 12% increase\n\n" +
      "I can prepare a detailed reply with the amounts and key dates. Would you like me to draft a reply?",
    replyContent: {
      intro:  "We have noted your request for the breakdown of your service charges and fund calls for the property <strong>APPT 42 RUE DU COMMERCE</strong>.",
      points: [
        "2024 service charge reconciliation: the detailed document will be sent within <strong>48 working hours</strong>",
        "Q1 2025 fund call: <strong>€1,240</strong>, due 31/01/2025",
        "Q2 2025 fund call: <strong>€1,240</strong>, due 30/04/2025",
        "The 12% increase is due to rising shared energy costs (collective heating, common area lighting)",
      ],
      closing: "Your manager Mr Lambert is available for any further information. Please do not hesitate to contact us.",
    },
    relatedRecords: {
      factures:      [
        { label: "2024 service charge reconciliation", status: 'Pending', date: '10/01/2026' },
        { label: 'Q1 2025 fund call — €1,240',         status: 'Paid',    date: '31/01/2025' },
        { label: 'Q4 2024 fund call — €1,100',         status: 'Paid',    date: '01/10/2024' },
      ],
      ordresTravail: [],
      devis:         [],
      casDeSoutien:  [
        { label: '2024 charge detail request — #3204', status: 'Open', date: '12/01/2026' },
      ],
      contrats:      [
        { label: 'Tenancy agreement — APPT 42 RUE DU COMMERCE', status: 'Active', date: '01/03/2022' },
      ],
    },
  },

  'elias@auditlawyer.club': {
    contact: {
      name:            'Elias Moreau',
      role:            'Client · Audit Lawyer Club',
      tags:            ['Co-ownership', 'Administrative'],
      property:        'SDC TOUR BELLEVUE',
      milleniumLinked: true,
    },
    conversation: {
      subject: 'Document submission — Change of managing agent',
      date:    new Date().toLocaleDateString('en-GB'),
      preview: 'Following the change of managing agent, I am sending you the documents required to update the syndic file.',
    },
    alerts: [
      { level: 'orange', text: 'Change of agent — file update required' },
      { level: 'yellow', text: 'Documents pending administrative validation' },
    ],
    properties: [
      {
        name:   'SDC TOUR BELLEVUE',
        type:   'Co-ownership',
        detail: '56 units · Manager: Mr Petit',
        tags: [
          { label: 'Co-ownership',      color: 'blue' },
          { label: 'Admin in progress', color: 'grey' },
        ],
      },
    ],
    aiMessage:
      "I've analysed Elias Moreau's email regarding the **change of managing agent** (SDC TOUR BELLEVUE).\n\n" +
      "He is submitting 4 administrative documents following the AGM of 03/01/2025:\n• AGM minutes\n• Management mandate\n• Updated list of co-owners\n• Updated bank details\n\n" +
      "I recommend acknowledging receipt and confirming the processing timeline. Would you like me to prepare the reply?",
    replyContent: {
      intro:  "We confirm receipt of the documents you have submitted in connection with the change of managing agent for <strong>SDC TOUR BELLEVUE</strong>.",
      points: [
        "✓ AGM minutes dated 03/01/2025 — <strong>Received</strong>",
        "✓ Management mandate signed by the new agent — <strong>Received</strong>",
        "✓ Updated list of co-owners — <strong>Received</strong>",
        "✓ Updated bank details — <strong>Received</strong>",
      ],
      closing: "The administrative update to your file will be completed within <strong>5 working days</strong>. You will receive a confirmation email upon completion. Your manager Mr Petit remains at your disposal.",
    },
    relatedRecords: {
      factures:      [
        { label: 'Syndic fees 2025 — SDC TOUR BELLEVUE', status: 'Pending', date: '05/01/2026' },
      ],
      ordresTravail: [],
      devis:         [],
      casDeSoutien:  [
        { label: 'Change of agent — file update',      status: 'Open',        date: '06/01/2026' },
        { label: 'Document validation AGM 03/01/2025', status: 'In progress', date: '03/01/2025' },
      ],
      contrats:      [
        { label: 'Syndic mandate 2025 — SDC TOUR BELLEVUE', status: 'Active', date: '03/01/2025' },
      ],
    },
  },
};

const DEFAULT_MOCK = {
  contact: {
    name:            'Damien Pozzi',
    role:            'Internal collaborator · Test-Sirius-Reemia',
    tags:            ['Co-ownership', 'Rental management', 'Active supplier'],
    property:        'SDC BLO VOLTAIRE',
    milleniumLinked: true,
  },
  conversation: {
    subject: "Insurance information request",
    date:    '19/12/2025',
    preview: 'Request for a copy of the current MRCI multi-risk building insurance contract.',
  },
  alerts: [
    { level: 'red',    text: 'Fund call pending — SDC BLO VOLTAIRE · response required' },
    { level: 'orange', text: 'Supplier works request in progress (authorisation required)' },
    { level: 'yellow', text: 'Bin store damage reported — ticket open' },
  ],
  properties: [
    {
      name:   'SDC BLO VOLTAIRE',
      type:   'Co-ownership',
      detail: '34 units · Manager: Mr Arnaud',
      tags: [
        { label: 'Co-ownership',      color: 'blue'   },
        { label: 'Fund call pending', color: 'orange' },
      ],
    },
    {
      name:   'SOC MAIRIE ST MAUR',
      type:   'Rental management',
      detail: 'Lease in progress',
      tags: [{ label: 'Active tenant', color: 'green' }],
    },
  ],
  aiMessage: null, // will be generated from subject
  replyContent: null,
  relatedRecords: {
    factures:      [
      { label: 'Q4 2025 fund call — SDC BLO VOLTAIRE', status: 'Pending',     date: '01/10/2025' },
      { label: '2024 service charges — Reconciliation', status: 'Paid',        date: '30/06/2025' },
    ],
    ordresTravail: [
      { label: 'Bin store repair — Block B',     status: 'In progress', date: '15/12/2025' },
      { label: 'Supplier works — Electrical',    status: 'Pending',     date: '10/12/2025' },
    ],
    devis:         [
      { label: 'Bin store refurbishment — Quote #2025-442', status: 'Proposed', date: '12/12/2025' },
    ],
    casDeSoutien:  [
      { label: 'Bin store damage — #3891',            status: 'Open',        date: '14/12/2025' },
      { label: "Insurance MRCI — copy contract request", status: 'In progress', date: '19/12/2025' },
    ],
    contrats:      [
      { label: 'Co-ownership contract 2025 — SDC BLO VOLTAIRE', status: 'Active', date: '01/01/2025' },
    ],
  },
};

// ── Extract email from SDK contact (try every known field) ───────────────────

function extractEmail(ctx) {
  const candidates = [
    ctx.contact?.handle,
    ctx.contact?.email,
    ctx.contact?.handles?.[0]?.handle,
    ctx.contact?.handles?.find(h => h.type === 'email')?.handle,
    ctx.conversation?.recipient?.handle,
    ctx.conversation?.recipient?.email,
  ].filter(Boolean);

  console.log('[MAILO] contact candidates:', candidates);
  console.log('[MAILO] raw contact:', JSON.stringify(ctx.contact));

  const email = candidates.find(c => c.includes('@')) || '';
  return email.toLowerCase();
}

// ── Build plugin context from SDK context ────────────────────────────────────

function resolveContext(sdkCtx) {
  const email = extractEmail(sdkCtx);
  console.log('[MAILO] matched email:', email);

  const mock = MOCK_BY_EMAIL[email] || DEFAULT_MOCK;
  const conv = sdkCtx.conversation || {};

  return {
    contact: {
      name:            sdkCtx.contact?.name || mock.contact.name,
      role:            mock.contact.role,
      tags:            mock.contact.tags,
      property:        mock.contact.property,
      milleniumLinked: mock.contact.milleniumLinked,
    },
    conversation: {
      subject: conv.subject || mock.conversation.subject,
      date:    conv.updatedAt
        ? new Date(conv.updatedAt).toLocaleDateString('en-GB')
        : mock.conversation.date,
      preview:
        (conv.latestMessage && conv.latestMessage.text) ||
        mock.conversation.preview,
    },
    alerts:         mock.alerts,
    properties:     mock.properties,
    aiMessage:      mock.aiMessage,
    replyContent:   mock.replyContent,
    relatedRecords: mock.relatedRecords,
  };
}

// ── Front compose wrapper ────────────────────────────────────────────────────
// The correct SDK API is context.createDraft() with replyOptions pointing to
// the latest message ID — NOT Front.compose (which doesn't exist in this SDK).

let _frontCtx = null;

window.frontCompose = {
  async reply(htmlBody) {
    if (_frontCtx && typeof _frontCtx.createDraft === 'function') {
      try {
        // Resolve the latest inbound message to reply to
        const msgList = await _frontCtx.listMessages();
        const msgs    = msgList.results || [];
        const latest  = msgs[msgs.length - 1];

        if (!latest) throw new Error('No messages found in conversation');

        await _frontCtx.createDraft({
          replyOptions: {
            type:              'reply',
            originalMessageId: latest.id,
          },
          content: {
            body: htmlBody,
            type: 'html',
          },
        });

        window.dispatchEvent(new CustomEvent('mailo:compose:success'));
        console.log('[MAILO] Reply draft created — message id:', latest.id);
      } catch (e) {
        console.error('[MAILO] createDraft error:', e);
        window.dispatchEvent(new CustomEvent('mailo:compose', { detail: { body: htmlBody } }));
      }
    } else {
      // Standalone dev mode — show modal preview
      console.warn('[MAILO] No Front context — using modal preview');
      window.dispatchEvent(new CustomEvent('mailo:compose', { detail: { body: htmlBody } }));
    }
  },
};

// ── Front SDK subscription ───────────────────────────────────────────────────

let receivedFrontCtx = false;

try {
  Front.contextUpdates.subscribe((ctx) => {
    receivedFrontCtx = true;
    _frontCtx = ctx;

    // Expose inbox ID for the seed endpoint
    window.frontInboxId = ctx.conversation?.inboxes?.[0]?.id || null;

    const pluginCtx = ctx.type === 'singleConversation'
      ? resolveContext(ctx)
      : DEFAULT_MOCK;

    if (typeof window.renderPlugin === 'function') window.renderPlugin(pluginCtx);
  });
} catch (e) {
  console.warn('[MAILO] Front SDK unavailable, using mock data.', e.message);
}

// Fallback: no Front context after 800 ms → use default mock
setTimeout(() => {
  if (!receivedFrontCtx && typeof window.renderPlugin === 'function') {
    console.log('[MAILO] Standalone mode — rendering with mock data');
    window.renderPlugin(DEFAULT_MOCK);
  }
}, 800);
