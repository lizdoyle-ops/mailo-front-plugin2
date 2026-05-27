import Front from '@frontapp/plugin-sdk';

// ── Mock data keyed by contact email ────────────────────────────────────────

const MOCK_BY_EMAIL = {
  'leyton@finalproduction.club': {
    contact: {
      name:            'Leyton Bernard',
      role:            'Client · Final Production Club',
      tags:            ['Copropriété', 'Maintenance urgente'],
      property:        'RES LES AMANDIERS',
      milleniumLinked: true,
    },
    conversation: {
      subject: 'Panne chaudière collective — Intervention urgente requise',
      date:    new Date().toLocaleDateString('fr-FR'),
      preview: 'La chaudière collective est tombée en panne hier soir. Plusieurs locataires se retrouvent sans chauffage ni eau chaude.',
    },
    alerts: [
      { level: 'red',    text: 'Panne chaudière — intervention urgente requise' },
      { level: 'orange', text: 'Plusieurs locataires impactés (chauffage / eau chaude)' },
      { level: 'yellow', text: 'Prestataire de maintenance notifié — réponse en attente' },
    ],
    properties: [
      {
        name:   'RES LES AMANDIERS',
        type:   'Copropriété',
        detail: '18 lots · Gestionnaire : Mme Dupuis',
        tags: [
          { label: 'Syndic',             color: 'blue' },
          { label: 'Maintenance urgente', color: 'red'  },
        ],
      },
    ],
    aiMessage:
      "J'ai analysé l'email de Leyton Bernard concernant la **panne de chaudière collective** (RES LES AMANDIERS).\n\n" +
      "⚠️ Situation urgente : plusieurs locataires sont sans chauffage ni eau chaude depuis hier soir.\n\n" +
      "Je recommande d'accuser réception immédiatement, de confirmer l'ouverture d'un ordre de service et d'indiquer le délai d'intervention.\n\n" +
      "Voulez-vous que je génère le brouillon de réponse ?",
    replyContent: {
      intro:  "Nous avons bien reçu votre signalement concernant la panne de la chaudière collective au sein de la résidence <strong>RES LES AMANDIERS</strong> et comprenons l'urgence de la situation.",
      points: [
        "Un ordre de service a été immédiatement ouvert auprès de notre prestataire de maintenance agréé",
        "Une intervention technique est planifiée dans les <strong>24 heures</strong>",
        "Votre gestionnaire Mme Dupuis assure le suivi de votre dossier",
        "Un numéro de suivi vous sera communiqué dès confirmation de l'intervention",
      ],
      closing: "Nous vous tiendrons informé de l'avancement par retour d'email. Nous nous excusons pour la gêne occasionnée.",
    },
  },

  'sarah@zestymedia.club': {
    contact: {
      name:            'Sarah Vidal',
      role:            'Cliente · Zesty Media',
      tags:            ['Gestion locative', 'Question financière'],
      property:        'APPT 42 RUE DU COMMERCE',
      milleniumLinked: true,
    },
    conversation: {
      subject: 'Demande de détail charges locatives et appels de fonds 2025',
      date:    new Date().toLocaleDateString('fr-FR'),
      preview: "Je souhaite obtenir le détail des charges récupérables pour l'exercice 2025 ainsi que les prochains appels de fonds.",
    },
    alerts: [
      { level: 'orange', text: 'Appel de fonds Q1 2025 — réponse en attente' },
      { level: 'yellow', text: 'Régularisation charges 2024 — dossier en cours' },
    ],
    properties: [
      {
        name:   'APPT 42 RUE DU COMMERCE',
        type:   'Gestion locative',
        detail: 'Bail en cours · Gestionnaire : M. Lambert',
        tags: [
          { label: 'Locataire actif',          color: 'green'  },
          { label: 'Appel fonds en attente',    color: 'orange' },
        ],
      },
    ],
    aiMessage:
      "J'ai analysé la demande de Sarah Vidal concernant les **charges locatives et appels de fonds** (APPT 42 RUE DU COMMERCE).\n\n" +
      "Elle souhaite :\n• Le détail des charges récupérables 2024\n• Le calendrier des appels de fonds Q1–Q2 2025\n• Une explication sur la hausse de 12 %\n\n" +
      "Je peux préparer une réponse détaillée avec les montants et les dates clés. Voulez-vous que je rédige le brouillon ?",
    replyContent: {
      intro:  "Nous avons bien pris en compte votre demande concernant le détail de vos charges locatives et les appels de fonds pour le bien <strong>APPT 42 RUE DU COMMERCE</strong>.",
      points: [
        "Régularisation charges 2024 : le document détaillé vous sera transmis sous <strong>48 heures ouvrées</strong>",
        "Appel de fonds Q1 2025 : <strong>1 240 €</strong>, échéance le 31/01/2025",
        "Appel de fonds Q2 2025 : <strong>1 240 €</strong>, échéance le 30/04/2025",
        "L'augmentation de 12 % constatée est liée à la hausse des coûts énergétiques communs (chauffage collectif, éclairage parties communes)",
      ],
      closing: "Votre gestionnaire M. Lambert reste disponible pour tout complément d'information. N'hésitez pas à nous recontacter.",
    },
  },

  'elias@auditlawyer.club': {
    contact: {
      name:            'Elias Moreau',
      role:            'Client · Audit Lawyer Club',
      tags:            ['Copropriété', 'Administratif'],
      property:        'SDC TOUR BELLEVUE',
      milleniumLinked: true,
    },
    conversation: {
      subject: 'Transmission documents — Changement mandataire syndic',
      date:    new Date().toLocaleDateString('fr-FR'),
      preview: 'Suite au changement de mandataire, je vous transmets les documents requis pour la mise à jour du dossier syndic.',
    },
    alerts: [
      { level: 'orange', text: 'Changement mandataire — mise à jour dossier requise' },
      { level: 'yellow', text: 'Documents en attente de validation administrative' },
    ],
    properties: [
      {
        name:   'SDC TOUR BELLEVUE',
        type:   'Copropriété',
        detail: '56 lots · Gestionnaire : M. Petit',
        tags: [
          { label: 'Syndic',         color: 'blue' },
          { label: 'Admin en cours', color: 'grey' },
        ],
      },
    ],
    aiMessage:
      "J'ai analysé l'email d'Elias Moreau concernant le **changement de mandataire syndic** (SDC TOUR BELLEVUE).\n\n" +
      "Il transmet 4 documents administratifs suite à l'AG du 03/01/2025 :\n• PV d'assemblée générale\n• Mandat de gestion\n• Liste des copropriétaires\n• RIB mis à jour\n\n" +
      "Je recommande d'accuser réception et de confirmer le délai de traitement. Voulez-vous que je prépare la réponse ?",
    replyContent: {
      intro:  "Nous accusons bonne réception des documents que vous nous avez transmis dans le cadre du changement de mandataire pour la <strong>SDC TOUR BELLEVUE</strong>.",
      points: [
        "✓ Procès-verbal d'assemblée générale du 03/01/2025 — <strong>Reçu</strong>",
        "✓ Mandat de gestion signé par le nouveau mandataire — <strong>Reçu</strong>",
        "✓ Liste actualisée des copropriétaires — <strong>Reçu</strong>",
        "✓ Coordonnées bancaires (RIB) mises à jour — <strong>Reçu</strong>",
      ],
      closing: "La mise à jour administrative de votre dossier sera effectuée dans un délai de <strong>5 jours ouvrés</strong>. Vous recevrez une confirmation par email à l'issue de cette démarche. Votre gestionnaire M. Petit reste à votre disposition.",
    },
  },
};

const DEFAULT_MOCK = {
  contact: {
    name:            'Damien Pozzi',
    role:            'Collaborateur interne · Test-Sirius-Reemia',
    tags:            ['Copropriété', 'Gestion locative', 'Fournisseur actif'],
    property:        'SDC BLO VOLTAIRE',
    milleniumLinked: true,
  },
  conversation: {
    subject: "Demande d'informations sur l'assurance",
    date:    '19/12/2025',
    preview: 'Demande de copie du contrat MRCI multirisque immeuble en cours.',
  },
  alerts: [
    { level: 'red',    text: 'Appel de fonds en attente — SDC BLO VOLTAIRE · réponse requise' },
    { level: 'orange', text: 'Demande travaux fournisseur en cours (autorisation requise)' },
    { level: 'yellow', text: 'Dégradation local poubelles signalée — ticket ouvert' },
  ],
  properties: [
    {
      name:   'SDC BLO VOLTAIRE',
      type:   'Copropriété',
      detail: '34 lots · Gestionnaire : M. Arnaud',
      tags: [
        { label: 'Syndic',                 color: 'blue'   },
        { label: 'Appel fonds en attente', color: 'orange' },
      ],
    },
    {
      name:   'SOC MAIRIE ST MAUR',
      type:   'Gestion locative',
      detail: 'Bail en cours',
      tags: [{ label: 'Locataire actif', color: 'green' }],
    },
  ],
  aiMessage: null, // will be generated from subject
  replyContent: null,
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
        ? new Date(conv.updatedAt).toLocaleDateString('fr-FR')
        : mock.conversation.date,
      preview:
        (conv.latestMessage && conv.latestMessage.text) ||
        mock.conversation.preview,
    },
    alerts:       mock.alerts,
    properties:   mock.properties,
    aiMessage:    mock.aiMessage,
    replyContent: mock.replyContent,
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
