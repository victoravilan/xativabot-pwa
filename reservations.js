// netlify/functions/reservations.js
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const {
      id, name, email, phone, dateTime, dateTimeISO, partySize,
      dishes, allergies, notes, uiLanguage, region
    } = payload;

    if (!name || !(dateTime || dateTimeISO)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields (name, dateTime)' }) };
    }

    // Fecha legible local
    const whenLocal = dateTime || (dateTimeISO
      ? new Date(dateTimeISO).toLocaleString('es-ES', { hour12: false })
      : '-');

    // Monta el mensaje (HTML para evitar líos de escape con Markdown V2)
    const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    const lines = [
      `<b>🧾 Nueva reserva Xativa</b>`,
      `• <b>Nombre:</b> ${esc(name)}`,
      `• <b>Tel/Email:</b> ${esc(phone || '-')} / ${esc(email || '-')}`,
      `• <b>Fecha/hora:</b> ${esc(whenLocal)}`,
      `• <b>Comensales:</b> ${esc(partySize || '-')}`,
      `• <b>Platos:</b> ${esc(dishes || '-')}`,
      `• <b>Alergias:</b> ${esc(allergies || '-')}`,
      `• <b>Notas:</b> ${esc(notes || '-')}`,
      `• <b>Idioma UI:</b> ${esc(uiLanguage || '-')}${region ? ` • <b>Región:</b> ${esc(region)}` : ''}`
    ];
    const text = lines.join('\n');

    // Envío a Telegram
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
    let notified = false, tgStatus = null;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const tgURL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      const res = await fetch(tgURL, {
        method: 'POST',
        headers: { 'content-type': 'application/json;charset=UTF-8' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });
      tgStatus = res.status;
      notified = res.ok;
      if (!res.ok) {
        const err = await res.text();
        console.error('Telegram send error:', res.status, err);
      }
    } else {
      console.warn('TELEGRAM_* env vars missing; skipping Telegram notify');
    }

    // Devuelve al cliente
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        reservation: {
          id,
          name,
          email,
          phone,
          dateTime: whenLocal,
          partySize,
          dishes, allergies, notes,
          uiLanguage, region
        },
        notified,
        tgStatus
      })
    };
  } catch (e) {
    console.error('reservations error', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
