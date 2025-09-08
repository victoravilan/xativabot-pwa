// netlify/functions/knowledge.js
// Busca conocimiento culinario y de salud (Wikipedia REST) con fallback curado para “colesterol”.

const ALLOWED = new Set(['es','en','ca']);

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const topicRaw = String(params.topic || '').trim();
    let lang = String(params.lang || 'es').toLowerCase();
    const kind = String(params.kind || '').toLowerCase(); // 'health' opcional
    if (!ALLOWED.has(lang)) lang = 'es';
    if (!topicRaw) return json(400, { ok:false, error:'Missing topic' });

    const topicNorm = normalizeTitle(topicRaw, lang);

    // Fallback curado para colesterol (ES/EN/CA)
    const curated = curatedHealth(topicNorm, lang);
    if (curated) return json(200, { ok:true, lang, title: topicNorm, text: curated });

    // 1) Intento directo summary
    let primary = await fetchSummary(lang, topicNorm);

    // 2) Si no hay extract, buscar título
    if (!primary?.extract) {
      const found = await searchTitle(lang, topicRaw);
      if (found?.title) primary = await fetchSummary(lang, found.title);
    }

    // 3) Fallback a EN si sigue vacío
    if (!primary?.extract) {
      const titleEn = normalizeTitle(topicRaw, 'en');
      primary = await fetchSummary('en', titleEn) || await fetchSummary('en', (await searchTitle('en', topicRaw))?.title || titleEn);
      if (!primary?.extract) return json(404, { ok:false, error:'Not found' });
      return json(200, { ok:true, lang:'en', title: primary.title, text: squeeze(primary.extract) });
    }

    return json(200, { ok:true, lang, title: primary.title, text: squeeze(primary.extract) });

  } catch (e) {
    console.error('knowledge error', e);
    return json(500, { ok:false, error:'Server error' });
  }
};

function json(statusCode, body){
  return {
    statusCode,
    headers: {
      'Content-Type':'application/json; charset=utf-8',
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods':'GET,OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

function normalizeTitle(q, lang){
  const s = q.toLowerCase().trim();
  const map = {
    es: { 'arroz':'Arroz','azafran':'Azafrán','azafrán':'Azafrán','aceite de oliva':'Aceite de oliva','ajo':'Ajo','tomate':'Tomate','pimenton':'Pimentón','pimentón':'Pimentón',
          'fideua':'Fideuá','fideuà':'Fideuá','paella':'Paella','all i pebre':'All i pebre','colesterol':'Colesterol' },
    en: { 'rice':'Rice','saffron':'Saffron','olive oil':'Olive oil','garlic':'Garlic','tomato':'Tomato','paprika':'Paprika','paella':'Paella','fideua':'Fideuà','all i pebre':'All i pebre','cholesterol':'Cholesterol' },
    ca: { 'arròs':'Arròs','safrà':'Safrà',"oli d'oliva":"Oli d'oliva","all":"All","tomàquet":"Tomàquet","pebre roig":"Pebre roig",'fideuà':'Fideuà','paella':'Paella','all i pebre':'All i pebre','colesterol':'Colesterol' }
  }[lang] || {};
  return map[s] || capitalizeFirst(s);
}

function capitalizeFirst(s){
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function fetchSummary(lang, title){
  if (!title) return null;
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'accept':'application/json' } });
  if (!res.ok) return null;
  return await res.json();
}

async function searchTitle(lang, q){
  const url = `https://${lang}.wikipedia.org/api/rest_v1/search/title/${encodeURIComponent(q)}?limit=1`;
  const res = await fetch(url, { headers: { 'accept':'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  const first = data?.pages?.[0];
  return first ? { title: first.title } : null;
}

function squeeze(t){
  return String(t).replace(/\s+/g,' ').trim();
}

// Fallback curado (resumen amigable) para “colesterol”
function curatedHealth(topic, lang){
  const t = topic.toLowerCase();
  const isChol = (t.includes('colesterol') || t.includes('cholesterol'));
  if (!isChol) return null;

  if (lang==='es') {
    return [
      "• **Cómo bajarlo (LDL):** fibra soluble (avena/cebada, legumbres), frutos secos (nueces/almendras), aceite de oliva virgen extra, pescado azul (omega-3), esteroles/estanoles vegetales, patrón tipo Mediterráneo.",
      "• **Qué limitar/evitar:** grasas trans (bollería industrial), exceso de grasas saturadas (carnes procesadas, ciertos embutidos), ultraprocesados, azúcares en exceso si hay hipertrigliceridemia.",
      "• **Hábitos:** más verduras y fruta, grano entero, ejercicio regular, no fumar.",
      "• **Nota:** orientación general; consulta a tu profesional de salud para un plan personalizado."
    ].join(' ');
  }
  if (lang==='ca') {
    return [
      "• **Com baixar-lo (LDL):** fibra soluble (civada/ordi, llegums), fruits secs (nous/ametlles), oli d'oliva verge extra, peix blau (omega-3), esterols/estanols vegetals, patró Mediterrani.",
      "• **Què limitar/evitar:** greixos trans (brioixeria industrial), excés de saturats (carns processades), ultraprocessats, sucres elevats si hi ha hipertrigliceridèmia.",
      "• **Hàbits:** més verdura i fruita, gra sencer, exercici regular, no fumar.",
      "• **Nota:** orientació general; consulta el teu professional de salut."
    ].join(' ');
  }
  // en
  return [
    "• **Lowering LDL:** soluble fiber (oats/barley, legumes), nuts (walnuts/almonds), extra-virgin olive oil, fatty fish (omega-3), plant sterols/stanols, Mediterranean-style pattern.",
    "• **Limit/avoid:** trans fats (industrial pastries), excess saturated fats (processed meats), ultra-processed foods, high sugars if hypertriglyceridemia.",
    "• **Habits:** more veg/fruit, whole grains, regular exercise, no smoking.",
    "• **Note:** general information; consult your health professional."
  ].join(' ');
}
