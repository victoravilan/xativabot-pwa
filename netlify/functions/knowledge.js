// netlify/functions/knowledge.js (CommonJS)

const ALLOWED = new Set(['es','en','ca']);

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const topicRaw = String(params.topic || '').trim();
    let lang = String(params.lang || 'es').toLowerCase();
    const kind = String(params.kind || '').toLowerCase(); // 'health' opcional
    if (!ALLOWED.has(lang)) lang = 'es';
    if (!topicRaw) return json(400, { ok:false, error:'Missing topic' });

    const topicNorm = normalizeTitle(topicRaw, lang);

    // Fallback curado para colesterol
    const curated = curatedHealth(topicNorm, lang);
    if (curated) return json(200, { ok:true, lang, title: topicNorm, text: curated });

    // 1) summary directo
    let primary = await fetchSummary(lang, topicNorm);

    // 2) buscar título si no hay extract
    if (!primary?.extract) {
      const found = await searchTitle(lang, topicRaw);
      if (found?.title) primary = await fetchSummary(lang, found.title);
    }

    // 3) fallback a EN
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
function capitalizeFirst(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

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
function squeeze(t){ return String(t).replace(/\s+/g,' ').trim(); }

function curatedHealth(topic, lang){
  const t = topic.toLowerCase();
  const isChol = (t.includes('colesterol') || t.includes('cholesterol'));
  if (!isChol) return null;

  if (lang==='es') {
    return [
      "• **Cómo bajarlo (LDL):** fibra soluble (avena/cebada, legumbres), frutos secos (nueces/almendras), AOVE, pescado azul (omega-3), esteroles vegetales, patrón Mediterráneo.",
      "• **Qué limitar/evitar:** grasas trans, exceso de saturadas, ultraprocesados, azúcares altos si hay hipertrigliceridemia.",
      "• **Hábitos:** más verdura/fruta, grano entero, ejercicio regular, no fumar.",
      "• **Nota:** información general; consulta a tu profesional de salud."
    ].join(' ');
  }
  if (lang==='ca') {
    return [
      "• **Com baixar-lo (LDL):** fibra soluble (civada/ordi, llegums), fruits secs (nous/ametlles), OOVE, peix blau (omega-3), esterols vegetals, patró Mediterrani.",
      "• **Limitar/evitar:** greixos trans, excés de saturats, ultraprocessats, sucres elevats si hi ha hipertrigliceridèmia.",
      "• **Hàbits:** més verdura/fruit, gra sencer, exercici regular, no fumar.",
      "• **Nota:** informació general; consulta el teu professional de salut."
    ].join(' ');
  }
  return [
    "• **Lowering LDL:** soluble fiber (oats/barley, legumes), nuts (walnuts/almonds), EVOO, fatty fish (omega-3), plant sterols, Mediterranean pattern.",
    "• **Limit/avoid:** trans fats, excess saturated fats, ultra-processed foods, high sugars if hypertriglyceridemia.",
    "• **Habits:** more veg/fruit, whole grains, regular exercise, no smoking.",
    "• **Note:** general information; consult your health professional."
  ].join(' ');
}
