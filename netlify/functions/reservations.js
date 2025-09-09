// netlify/functions/reservations.js
// Enruta reservas por restaurante y envía email usando Resend API (sin dependencias)

const RESTAURANTS = {
  // 👇 RELLENA con los correos reales de cada local
  les_corts: {
    name: 'Xàtiva · Les Corts (Bordeus, 35)',
    email: 'victoravilan@gmail.com'
  },
  gracia: {
    name: 'Xàtiva · Gràcia (Torrent d’en Vidalet, 26)',
    email: 'info.victoravilan@gmail.com'
  },
  sant_antoni: {
    name: 'Xàtiva · Sant Antoni (Muntaner, 6)',
    email: 'anandmahapatra@gmail.com'
  }
};

// Utilidad CORS
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

    const RESEND_API_KEY   = process.env.RESEND_API_KEY; // 🔐 Obligatorio
    const FROM_EMAIL       = process.env.RESERVATIONS_FROM || 'onboarding@resend.dev'; // mejor verificar tu dominio y cambiarlo
    const CC_EMAILS        = process.env.RESERVATIONS_CC || ''; // opcional, coma-separado
    const FALLBACK_EMAIL   = process.env.RESERVATIONS_FALLBACK || CC_EMAILS || ''; // si no encuentra restaurante

    if (!RESEND_API_KEY) {
      return cors(500, { ok:false, error:'Missing RESEND_API_KEY' });
    }

    const data = JSON.parse(event.body || '{}');
    const required = ['id','restaurant','name','dateTimeISO','partySize'];
    const missing = required.filter(k => !data[k]);
    if (missing.length) {
      return cors(400, { ok:false, error:`Missing fields: ${missing.join(', ')}` });
    }

    const rkey = String(data.restaurant || '').toLowerCase();
    const dest = RESTAURANTS[rkey];
    const to = (dest && dest.email) ? dest.email : FALLBACK_EMAIL;

    if (!to) {
      return cors(400, { ok:false, error:'Unknown restaurant and no FALLBACK email configured' });
    }

    // Datos
    const uiLang = (data.uiLanguage || 'es').toLowerCase();
    const whenISO = data.dateTimeISO;
    const whenLocalHint = data.dateTime || ''; // por si enviaste la hora local desde el form
    const pax = data.partySize;
    const name = data.name;
    const phone = data.phone || '';
    const email = data.email || '';
    const dishes = data.dishes || '';
    const allergies = data.allergies || '';
    const notes = data.notes || '';
    const restName = dest ? dest.name : (data.restaurant || '—');

    // Asunto por idioma
    const subjects = {
      es: `Reserva · ${restName} · ${pax} pax · ${name}`,
      en: `Reservation · ${restName} · ${pax} pax · ${name}`,
      ca: `Reserva · ${restName} · ${pax} pax · ${name}`
    };
    const subject = subjects[uiLang] || subjects.es;

    // Cuerpo en HTML
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">
        <h2 style="margin:0 0 12px">Nueva reserva</h2>
        <p><b>ID:</b> ${escapeHtml(data.id)}</p>
        <p><b>Restaurante:</b> ${escapeHtml(restName)}</p>
        <p><b>Fecha y hora (ISO):</b> ${escapeHtml(whenISO)}</p>
        ${whenLocalHint ? `<p><b>Fecha y hora (local, cliente):</b> ${escapeHtml(whenLocalHint)}</p>` : ''}
        <p><b>Comensales:</b> ${escapeHtml(String(pax))}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
        <p><b>Nombre:</b> ${escapeHtml(name)}</p>
        <p><b>Teléfono:</b> ${escapeHtml(phone)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Platos deseados:</b> ${escapeHtml(dishes)}</p>
        <p><b>Alergias/restricciones:</b> ${escapeHtml(allergies)}</p>
        <p><b>Notas:</b> ${escapeHtml(notes)}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
        <p style="font-size:12px;color:#777;margin-top:8px">Enviado por XativaBot · UI: ${escapeHtml(uiLang.toUpperCase())}</p>
      </div>
    `;

    // Construir payload para Resend
    const payload = {
      from: FROM_EMAIL,     // Ej.: "Reservas Xàtiva <reservas@tudominio.com>"
      to: [to],
      subject,
      html
    };
    if (CC_EMAILS) {
      payload.cc = CC_EMAILS.split(',').map(s => s.trim()).filter(Boolean);
    }

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
      return cors(502, { ok:false, error:'Email provider error', detail: txt || res.statusText });
    }

    const json = await res.json().catch(()=> ({}));
    return cors(200, { ok:true, providerId: json?.id || null, reservation: { id: data.id } });
  } catch (e) {
    console.error('reservations function error', e);
    return cors(500, { ok:false, error:'Server error' });
  }
};

// util pequeño para el HTML
function escapeHtml(s=''){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}
