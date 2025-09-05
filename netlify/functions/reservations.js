// netlify/functions/reservations.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const {
      id, name, email, phone, dateTime, dateTimeISO, partySize,
      dishes, allergies, notes, uiLanguage, region
    } = JSON.parse(event.body || '{}');

    if (!name || !(dateTime || dateTimeISO)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields (name, dateTime)' }) };
    }

    // Normaliza fecha a string legible
    const whenLocal = dateTime || new Date(dateTimeISO).toLocaleString('es-ES', { hour12:false });

    // 1) Aquí podrías guardar en BBDD/Sheet si quieres (omitido en este ejemplo)

    // 2) Notificación al móvil del gestor (Twilio)
    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_FROM,
      TWILIO_TO,
      TWILIO_CHANNEL // 'whatsapp' opcional
    } = process.env;

    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM && TWILIO_TO) {
      const bodyLines = [
        '🧾 Nueva reserva Xativa',
        `• Nombre: ${name}`,
        `• Tel/Email: ${phone || '-'} / ${email || '-'}`,
        `• Fecha/hora: ${whenLocal}`,
        `• Comensales: ${partySize || '-'}`,
        `• Platos: ${dishes || '-'}`,
        `• Alergias: ${allergies || '-'}`,
        `• Notas: ${notes || '-'}`,
        `• Idioma UI: ${uiLanguage || '-'}` + (region ? ` • Región: ${region}` : '')
      ];
      const msg = bodyLines.join('\n');

      const isWA = (TWILIO_CHANNEL || '').toLowerCase() === 'whatsapp';
      const to = isWA ? (TWILIO_TO.startsWith('whatsapp:') ? TWILIO_TO : `whatsapp:${TWILIO_TO}`) : TWILIO_TO;
      const from = isWA ? (TWILIO_FROM.startsWith('whatsapp:') ? TWILIO_FROM : `whatsapp:${TWILIO_FROM}`) : TWILIO_FROM;

      // Llamada simple a la API REST de Twilio (sin SDK)
      const creds = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const form = new URLSearchParams({ To: to, From: from, Body: msg });

      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: form.toString()
      });

      if (!resp.ok) {
        const errTxt = await resp.text();
        console.error('Twilio error:', resp.status, errTxt);
      }
    } else {
      console.warn('Twilio env vars missing; SMS/WA not sent.');
    }

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
        }
      })
    };
  } catch (e) {
    console.error('reservations error', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
