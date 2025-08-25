/**
 * Netlify Function: reservations
 * Valida y recibe reservas desde la PWA.
 * - CORS con preflight (OPTIONS)
 * - Validación de cuerpo
 * - Envío opcional por correo (SendGrid) si se configuran variables de entorno
 * 
 * Env vars recomendadas:
 *   ALLOWED_ORIGINS=https://tu-sitio.netlify.app,https://tudominio.com
 *   SENDGRID_API_KEY=SG.xxxxx
 *   RESERVATION_TO_EMAIL=reservas@tudominio.com
 *   RESERVATION_FROM_EMAIL=bot@tudominio.com
 */

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:8888', 'http://localhost:5173'];

exports.handler = async (event, context) => {
  const origin = event.headers.origin || '';
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const isAllowed =
    (allowedOrigins.length ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS).includes(origin);

  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' }, corsHeaders);
  }

  // Parse JSON
  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON body' }, corsHeaders);
  }

  // ---- Validación de campos ----
  const errors = [];
  const {
    name,
    phone,
    email,
    dateTime,    // ISO 8601 (ej: 2025-09-01T20:00:00Z o sin Z con timezone local)
    partySize,   // entero 1..20 (ajusta a tu sala)
    notes
  } = data;

  if (!name || String(name).trim().length < 2) errors.push('name is required (min 2 chars).');

  if (!phone && !email) errors.push('At least one of phone or email is required.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) errors.push('email is invalid.');
  if (phone && !/^[\d+\s().-]{6,}$/.test(String(phone))) errors.push('phone looks invalid.');

  // dateTime válido y en el futuro (con margen de 1 min)
  const dt = new Date(dateTime);
  if (!dateTime || isNaN(dt.getTime())) {
    errors.push('dateTime is required (ISO 8601).');
  } else {
    const now = Date.now() + 60 * 1000;
    if (dt.getTime() < now) errors.push('dateTime must be in the future.');
  }

  const size = parseInt(partySize, 10);
  if (!Number.isInteger(size) || size < 1 || size > 20) {
    errors.push('partySize must be an integer between 1 and 20.');
  }

  if (errors.length) {
    return json(400, { error: 'Validation failed', details: errors }, corsHeaders);
  }

  // ---- Aquí podrías persistir en DB / Sheet / etc. ----
  // Por ahora, simulamos un ID y devolvemos éxito.
  const reservation = {
    id: cryptoRandomId(),
    name: String(name).trim(),
    phone: phone ? String(phone).trim() : null,
    email: email ? String(email).trim() : null,
    dateTime: new Date(dt).toISOString(),
    partySize: size,
    notes: notes ? String(notes).trim() : ''
  };

  // Intento opcional de enviar correo con SendGrid
  try {
    await maybeSendEmail(reservation);
  } catch (e) {
    // No fallamos la reserva por un problema de correo; solo lo reportamos
    console.error('Email error:', e);
  }

  return json(201, { ok: true, reservation }, corsHeaders);
};

// ---------- Helpers ----------
function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
    body: JSON.stringify(body)
  };
}

function cryptoRandomId() {
  // id corto y legible (no críptico). Si quieres algo más robusto, usa uuid v4 en build tools.
  return 'res_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

async function maybeSendEmail(reservation) {
  const key = process.env.SENDGRID_API_KEY;
  const to = process.env.RESERVATION_TO_EMAIL;
  const from = process.env.RESERVATION_FROM_EMAIL || to;

  if (!key || !to) return;

  const subject = `Nueva reserva: ${reservation.name} (${reservation.partySize}) – ${new Date(reservation.dateTime).toLocaleString()}`;
  const text =
    `Reserva:\n` +
    `- Nombre: ${reservation.name}\n` +
    `- Email: ${reservation.email || '—'}\n` +
    `- Teléfono: ${reservation.phone || '—'}\n` +
    `- Fecha/Hora: ${reservation.dateTime}\n` +
    `- Personas: ${reservation.partySize}\n` +
    `- Notas: ${reservation.notes || '—'}\n` +
    `- ID: ${reservation.id}\n`;

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from, name: 'XativaBot' },
    subject,
    content: [{ type: 'text/plain', value: text }]
  };

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).then((r) => {
    if (!r.ok) throw new Error(`SendGrid ${r.status}`);
  });
}
