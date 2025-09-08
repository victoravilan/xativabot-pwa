// netlify/functions/knowledge.js
// Devuelve texto “erudito” para ingredientes/técnicas/historia desde Wikipedia REST.
// Flujo: summary directo -> si no hay, search/title -> summary del primer resultado.

const ALLOWED = new Set(['es','en','ca']);

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const topicRaw = String(params.topic || '').trim();
    let lang = String(params.lang || 'es').toLowerCase();
    if (!ALLOWED.has(lang)) lang = 'es';
    if (!topicRaw) return json(400, { ok:false, error:'Missing topic' });

    const titleGuess = normalizeTitle(topicRaw, lang);

    // 1) Intento directo
    let primary = await fetchSummary(lang, titleGuess);

    // 2) Si no hay extract, buscamos
    if (!primary?.extract) {
      const found = await searchTitle(lang, topicRaw);
      if (found?.title) primary = await fetchSummary(lang, found.title);
    }

    // 3) Fallback a EN
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
    es: {
      'arroz':'Arroz','azafran':'Azafrán','azafrán':'Azafrán','aceite de oliva':'Aceite de oliva',
      'ajo':'Ajo','tomate':'Tomate','pimenton':'Pimentón','pimentón':'Pimentón',
      'fideua':'Fideuá','fideuà':'Fideuá','paella':'Paella','all i pebre':'All i pebre',
      'cúrcuma':'Cúrcuma','curcuma':'Cúrcuma','comino':'Comino','canela':'Canela','clavo':'Clavo de olor',
      'nuez moscada':'Nuez moscada','laurel':'Laurus nobilis','vainilla':'Vainilla'
    },
    en: {
      'rice':'Rice','saffron':'Saffron','olive oil':'Olive oil','garlic':'Garlic','tomato':'Tomato','paprika':'Paprika',
      'paella':'Paella','fideua':'Fideuà','all i pebre':'All i pebre','turmeric':'Turmeric','cumin':'Cumin',
      'cinnamon':'Cinnamon','clove':'Clove','nutmeg':'Nutmeg','bay leaf':'Bay leaf','vanilla':'Vanilla'
    },
    ca: {
      'arròs':'Arròs','safrà':'Safrà',"oli d'oliva":"Oli d'oliva","all":"All","tomàquet":"Tomàquet","pebre roig":"Pebre roig",
      'fideuà':'Fideuà','paella':'Paella','all i pebre':'All i pebre'
    }
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
