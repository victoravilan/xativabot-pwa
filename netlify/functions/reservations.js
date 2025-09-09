// netlify/functions/reservations.js
// Enruta reservas por restaurante y envía email con Resend (sin dependencias)

const RESTAURANTS = {
  les_corts:   { name: 'Xàtiva · Les Corts (Bordeus, 35)',             email: 'victoravilan@gmail.com' },
  gracia:      { name: 'Xàtiva · Gràcia (Torrent d’en Vidalet, 26)',   email: 'info.victoravilan@gmail.com' },
  sant_antoni: { name: 'Xàtiva · Sant Antoni (Muntaner, 6)',           email: 'anandmahapatra@gmail.com' }
};

// CORS helper
function cors(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: body ? JSON.stringify(body) : ''
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return cors(200);
    if (event.httpMethod !== 'POST') return cors(405, { ok:false, error:'Method Not Allowed' });

    const TEST_MODE       = String(process.env.TEST_MODE || '') === '1';
    const RESEND_API_KEY  = process.env.RESEND_API_KEY; // 🔐
    const FROM_EMAIL      = process.env.RESERVATIONS_FROM || 'onboarding@resend.dev';
    const CC_EMAILS       = process.env.RESERVATIONS_CC || '';
    const FALLBACK_EMAIL  = process.env.RESERVATIONS_FALLBACK || CC_EMAILS || '';

    const data = safeJson(event.body);

    // === Validación flexible de campos ===
    const errors = [];
    if (!data.id)         errors.push('id');
    if (!data.name)       errors.push('name');
    if (!data.partySize)  errors.push('partySize');
    if (!data.restaurant) errors.push('restaurant');

    const dateISO   = data.dateTimeISO || '';           // recomendado
    const dateLocal = !dateISO ? (data.dateTime || '') : ''; // aceptado como fallback
    if (!dateISO && !dateLocal) errors.push('dateTimeISO|dateTime');

    if (errors.length) {
      return cors(400, { ok:false, error:`Missing fields: ${errors.join(', ')}`, received:Object.keys(data) });
    }

    const key  = String(data.restaurant || '').toLowerCase().trim();
    const dest = RESTAURANTS[key];
    const to   = (dest && dest.email) ? dest.email : FALLBACK_EMAIL;
    if (!to) {
      return cors(400, { ok:false, error:'Unknown restaurant and no FALLBACK email configured', restaurant:key });
    }

    const lang   = (data.uiLanguage || 'es').toLowerCase();
    const pax    = data.partySize;
    const phone  = data.phone  || '';
    const email  = data.email  || '';
    const dishes = data.dishes || '';
    const aller  = data.allergies || '';
    const notes  = data.notes || '';
    const restName = dest ? dest.name : (data.restaurant || '—');

    const subjects = {
      es: `Reserva · ${restName} · ${pax} pax · ${data.name}`,
      en: `Reservation · ${restName} · ${pax} pax · ${data.name}`,
      ca: `Reserva · ${restName} · ${pax} pax · ${data.name}`
    };
    const subject = subjects[lang] || subjects.es;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">
        <h2 style="margin:0 0 12px">Nueva reserva</h2>
        <p><b>ID:</b> ${eh(data.id)}</p>
        <p><b>Restaurante:</b> ${eh(restName)}</p>
        ${dateISO   ? `<p><b>Fecha y hora (ISO):</b> ${eh(dateISO)}</p>` : ''}
        ${dateLocal ? `<p><b>Fecha y hora (local, cliente):</b> ${eh(dateLocal)}</p>` : ''}
        <p><b>Comensales:</b> ${eh(String(pax))}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
        <p><b>Nombre:</b> ${eh(data.name)}</p>
        <p><b>Teléfono:</b> ${eh(phone)}</p>
        <p><b>Email:</b> ${eh(email)}</p>
        <p><b>Platos deseados:</b> ${eh(dishes)}</p>
        <p><b>Alergias/restricciones:</b> ${eh(aller)}</p>
        <p><b>Notas:</b> ${eh(notes)}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
        <p style="font-size:12px;color:#777;margin-top:8px">Enviado por XativaBot · UI: ${eh(lang.toUpperCase())}</p>
      </div>
    `;

    // ——— Modo prueba: no envía email, responde OK ———
    if (TEST_MODE) {
      console.log('[TEST_MODE] No se envía email. Payload de ejemplo:', { subject, to, cc: CC_EMAILS });
      return cors(200, { ok:true, test:true, reservation:{ id: data.id }, to, subject });
    }

    if (!RESEND_API_KEY) {
      return cors(500, { ok:false, error:'Missing RESEND_API_KEY' });
    }

    // Construcción del payload para Resend
    const payload = {
      from: FROM_EMAIL,            // Ej: "Reservas Xàtiva <reservas@tu-dominio.com>"
      to: [to],
      subject,
      html
    };
    if (CC_EMAILS) payload.cc = CC_EMAILS.split(',').map(s=>s.trim()).filter(Boolean);
    if (email)     payload.reply_to = email;   // que el restaurante pueda contestar al cliente

    // Envío
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      console.error('Resend error:', res.status, txt);
      return cors(502, { ok:false, error:'Email provider error', status:res.status, detail: txt || res.statusText });
    }

    const json = await res.json().catch(()=> ({}));
    return cors(200, { ok:true, providerId: json?.id || null, reservation:{ id: data.id } });

  } catch (e) {
    console.error('reservations function error', e);
    return cors(500, { ok:false, error:'Server error' });
  }
};

function safeJson(body){
  try { return JSON.parse(body || '{}'); }
  catch { return {}; }
}
function eh(s=''){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}
