// netlify/functions/reservations.js
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const {
      id, name, email, phone, dateTime, dateTimeISO, partySize,
      dishes, allergies, notes, uiLanguage, restaurant
    } = payload;

    if (!name || !(dateTime || dateTimeISO)) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing required fields (name, dateTime)' }) };
    }
    if (!restaurant || !['les_corts','gracia','sant_antoni'].includes(String(restaurant))) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing or invalid restaurant' }) };
    }

    const whenLocal = dateTime || (dateTimeISO
      ? new Date(dateTimeISO).toLocaleString('es-ES', { hour12:false })
      : '-');

    // Enviar email a la sucursal correspondiente (SendGrid)
    const sgResult = await emailToRestaurant({
      name, email, phone, whenLocal, partySize, dishes, allergies, notes, uiLanguage, restaurant
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        ok: true,
        reservation: {
          id, name, email, phone, dateTime: whenLocal, partySize,
          dishes, allergies, notes, uiLanguage, restaurant
        },
        emailed: sgResult.ok
      })
    };
  } catch (e) {
    console.error('reservations error', e);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Server error' }) };
  }
};

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

// ---- Email (SendGrid) ----
async function emailToRestaurant(info){
  try{
    const {
      SENDGRID_API_KEY,
      RESERVATION_FROM_EMAIL,
      REST_LES_CORTS_EMAIL,
      REST_GRACIA_EMAIL,
      REST_SANT_ANTONI_EMAIL
    } = process.env;

    if (!SENDGRID_API_KEY || !RESERVATION_FROM_EMAIL) {
      console.warn('SendGrid envs missing');
      return { ok:false, warn:'missing envs' };
    }

    const to = info.restaurant==='les_corts'   ? REST_LES_CORTS_EMAIL
            : info.restaurant==='gracia'       ? REST_GRACIA_EMAIL
            : /* sant_antoni */                  REST_SANT_ANTONI_EMAIL;

    if (!to){ console.warn('Missing restaurant recipient email'); return { ok:false, warn:'no recipient' }; }

    const subject = `Reserva · ${restaurantLabel(info.restaurant)} · ${info.whenLocal}`;
    const textLines = [
      `Nueva reserva Xativa`,
      `Restaurante: ${restaurantLabel(info.restaurant)}`,
      `Nombre: ${info.name}`,
      `Tel/Email: ${info.phone || '-'} / ${info.email || '-'}`,
      `Fecha/hora: ${info.whenLocal}`,
      `Comensales: ${info.partySize || '-'}`,
      `Platos: ${info.dishes || '-'}`,
      `Alergias: ${info.allergies || '-'}`,
      `Notas: ${info.notes || '-'}`,
      `Idioma UI: ${info.uiLanguage || '-'}`
    ];
    const html = `
      <h2>Nueva reserva Xativa</h2>
      <p><b>Restaurante:</b> ${restaurantLabel(info.restaurant)}</p>
      <p><b>Nombre:</b> ${escapeHTML(info.name)}</p>
      <p><b>Tel/Email:</b> ${escapeHTML(info.phone||'-')} / ${escapeHTML(info.email||'-')}</p>
      <p><b>Fecha/hora:</b> ${escapeHTML(info.whenLocal)}</p>
      <p><b>Comensales:</b> ${escapeHTML(info.partySize||'-')}</p>
      <p><b>Platos:</b> ${escapeHTML(info.dishes||'-')}</p>
      <p><b>Alergias:</b> ${escapeHTML(info.allergies||'-')}</p>
      <p><b>Notas:</b> ${escapeHTML(info.notes||'-')}</p>
      <p><b>Idioma UI:</b> ${escapeHTML(info.uiLanguage||'-')}</p>
    `;

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method:'POST',
      headers:{
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: RESERVATION_FROM_EMAIL, name: 'XativaBot' },
        subject,
        content: [
          { type: 'text/plain', value: textLines.join('\n') },
          { type: 'text/html',  value: html }
        ]
      })
    });

    if (!sgRes.ok){
      console.error('SendGrid error', sgRes.status, await sgRes.text());
      return { ok:false };
    }
    return { ok:true };
  }catch(e){
    console.error('SendGrid exception', e);
    return { ok:false };
  }
}

function restaurantLabel(code){
  if (code==='les_corts')  return 'Les Corts · Bordeus, 35';
  if (code==='gracia')     return 'Gràcia · Torrent d’en Vidalet, 26';
  if (code==='sant_antoni')return 'Sant Antoni · Muntaner, 6';
  return code;
}

function escapeHTML(s){ return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
