/**
 * Netlify Function: reservations
 * CORS + validación + envío opcional por SendGrid
 */

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:8888', 'http://localhost:5173'];

exports.handler = async (event) => {
  const origin = event.headers.origin || '';
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const isAllowed = (allowedOrigins.length ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS).includes(origin);

  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' }, corsHeaders);

  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON body' }, corsHeaders); }

  const errors = [];
  const { name, phone, email, dateTime, partySize, notes } = data;

  if (!name || String(name).trim().length < 2) errors.push('name is required (min 2 chars).');
  if (!phone && !email) errors.push('At least one of phone or email is required.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) errors.push('email is invalid.');
  if (phone && !/^[\d+\s().-]{6,}$/.test(String(phone))) errors.push('phone looks invalid.');

  const dt = new Date(dateTime);
  if (!dateTime || isNaN(dt.getTime())) errors.push('dateTime is required (ISO 8601).');
  else if (dt.getTime() < (Date.now() + 60 * 1000)) errors.push('dateTime must be in the future.');

  const size = parseInt(partySize, 10);
  if (!Number.isInteger(size) || size < 1 || size > 20) errors.push('partySize must be an integer between 1 and 20.');

  if (errors.length) return json(400, { error: 'Validation failed', details: errors }, corsHeaders);

  const reservation = {
    id: cryptoRandomId(),
    name: String(name).trim(),
    phone: phone ? String(phone).trim() : null,
    email: email ? String(email).trim() : null,
    dateTime: new Date(dt).toISOString(),
    partySize: size,
    notes: notes ? String(notes).trim() : ''
  };

  try { await maybeSendEmail(reservation); } catch(e){ console.error('Email error:', e); }

  return json(201, { ok: true, reservation }, corsHeaders);
};

function json(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }, body: JSON.stringify(body) };
}
function cryptoRandomId(){ return 'res_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }

async function maybeSendEmail(reservation){
  const key = process.env.SENDGRID_API_KEY;
  const to = process.env.RESERVATION_TO_EMAIL;
  const from = process.env.RESERVATION_FROM_EMAIL || to;
  if (!key || !to) return;

  const subject = `Nueva reserva: ${reservation.name} (${reservation.partySize}) – ${new Date(reservation.dateTime).toLocaleString()}`;
  const text =
`Reserva:
- Nombre: ${reservation.name}
- Email: ${reservation.email || '—'}
- Teléfono: ${reservation.phone || '—'}
- Fecha/Hora: ${reservation.dateTime}
- Personas: ${reservation.partySize}
- Notas: ${reservation.notes || '—'}
- ID: ${reservation.id}
`;

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations:[{ to:[{ email: to }] }],
      from:{ email: from, name: 'XativaBot' },
      subject, content:[{ type:'text/plain', value: text }]
    })
  }).then(r=>{ if(!r.ok) throw new Error(`SendGrid ${r.status}`); });
}
