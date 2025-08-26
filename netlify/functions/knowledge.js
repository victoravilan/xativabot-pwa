// netlify/functions/knowledge.js
// Obtiene un resumen breve del ingrediente desde Wikipedia (idioma solicitado) y
// añade nutrición básica (si está en nuestra tabla). Sin claves, CORS friendly.

const NUTRITION = {
  // valores aprox. por 100 g (referencia general)
  arroz:            { energy_kcal: 130, protein_g: 2.7, fat_g: 0.3, carbs_g: 28 }, // cocido
  "arroz blanco":   { energy_kcal: 130, protein_g: 2.7, fat_g: 0.3, carbs_g: 28 },
  "olive oil":      { energy_kcal: 884, protein_g: 0,   fat_g: 100, carbs_g: 0 },
  "aceite de oliva":{ energy_kcal: 884, protein_g: 0,   fat_g: 100, carbs_g: 0 },
  tomate:           { energy_kcal: 18,  protein_g: 0.9, fat_g: 0.2, carbs_g: 3.9 },
  "tomato":         { energy_kcal: 18,  protein_g: 0.9, fat_g: 0.2, carbs_g: 3.9 },
  ajo:              { energy_kcal: 149, protein_g: 6.4, fat_g: 0.5, carbs_g: 33 },
  "garlic":         { energy_kcal: 149, protein_g: 6.4, fat_g: 0.5, carbs_g: 33 },
  cebolla:          { energy_kcal: 40,  protein_g: 1.1, fat_g: 0.1, carbs_g: 9.3 },
  "onion":          { energy_kcal: 40,  protein_g: 1.1, fat_g: 0.1, carbs_g: 9.3 },
  "pimienta negra": { energy_kcal: 251, protein_g: 10,  fat_g: 3.3, carbs_g: 64 },
  "black pepper":   { energy_kcal: 251, protein_g: 10,  fat_g: 3.3, carbs_g: 64 },
  "cúrcuma":        { energy_kcal: 312, protein_g: 9.7, fat_g: 3.3, carbs_g: 67 },
  "turmeric":       { energy_kcal: 312, protein_g: 9.7, fat_g: 3.3, carbs_g: 67 },
  canela:           { energy_kcal: 247, protein_g: 4,   fat_g: 1.2, carbs_g: 81 },
  cinnamon:         { energy_kcal: 247, protein_g: 4,   fat_g: 1.2, carbs_g: 81 },
  comino:           { energy_kcal: 375, protein_g: 17.8,fat_g: 22,  carbs_g: 44 },
  cumin:            { energy_kcal: 375, protein_g: 17.8,fat_g: 22,  carbs_g: 44 },
  "azafrán":        { energy_kcal: 310, protein_g: 11,  fat_g: 6,   carbs_g: 65 },
  saffron:          { energy_kcal: 310, protein_g: 11,  fat_g: 6,   carbs_g: 65 },
  sal:              { energy_kcal: 0,   protein_g: 0,   fat_g: 0,   carbs_g: 0 },
  salt:             { energy_kcal: 0,   protein_g: 0,   fat_g: 0,   carbs_g: 0 }
};

export default async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const lang = (searchParams.get('lang') || 'es').toLowerCase();
    let term = (searchParams.get('ingredient') || '').trim();
    if (!term) return json(400, { error: 'Missing ingredient' });

    // Normaliza plurales comunes
    const norm = normalize(term, lang);

    // 1) Intento Wikipedia en el idioma elegido
    let summary = await wikiSummary(norm.query, lang);

    // 2) Fallbacks: si no hay en ese idioma, prueba en EN, luego ES
    if (!summary) summary = await wikiSummary(norm.query, 'en');
    if (!summary && lang !== 'es') summary = await wikiSummary(norm.query, 'es');

    // 3) Fallback final si sigue vacío
    if (!summary) {
      summary = genericSummary(norm.query, lang);
    }

    // 4) Nutrición aproximada (si tenemos mapeo)
    const key = (NUTRITION[norm.key] ? norm.key
               : NUTRITION[norm.query] ? norm.query
               : Object.keys(NUTRITION).find(k => k.toLowerCase() === norm.query.toLowerCase()));
    const nutrition = key ? NUTRITION[key] : null;

    return json(200, { summary, nutrition });
  } catch (e) {
    return json(500, { error: 'knowledge error', detail: String(e) });
  }
};

function json(status, body){
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function normalize(term, lang){
  const t = term.toLowerCase().trim();
  const plurals = {
    es: { "especias": "especia", "ingredientes": "ingrediente" },
    en: { "spices": "spice", "ingredients": "ingredient" },
    ca: { "espècies": "espècia", "ingredients": "ingredient" }
  }[lang] || {};
  const repl = plurals[t] || t;

  // claves preferidas para nutrición
  const keyMap = {
    es: { "arroz": "arroz", "arroz blanco":"arroz blanco", "aceite de oliva":"aceite de oliva", "tomate":"tomate", "ajo":"ajo", "cebolla":"cebolla", "pimienta negra":"pimienta negra", "cúrcuma":"cúrcuma", "canela":"canela", "comino":"comino", "azafrán":"azafrán", "sal":"sal" },
    en: { "rice":"arroz", "white rice":"arroz blanco", "olive oil":"olive oil", "tomato":"tomato", "garlic":"garlic", "onion":"onion", "black pepper":"black pepper", "turmeric":"turmeric", "cinnamon":"cinnamon", "cumin":"cumin", "saffron":"saffron", "salt":"salt" },
    ca: { "arròs":"arroz", "oli d'oliva":"aceite de oliva", "tomaca":"tomate", "tomate":"tomate", "all":"ajo", "ceba":"cebolla", "pebre negre":"pimienta negra", "cúrcuma":"cúrcuma", "canel·la":"canela", "comí":"comino", "safrà":"azafrán", "sal":"sal" }
  }[lang] || {};
  const key = keyMap[repl] || repl;

  // Título “bonito” para Wikipedia (mayúscula inicial)
  const query = repl.replace(/\s+/g,' ').trim().replace(/^./, c => c.toUpperCase());
  return { key, query };
}

async function wikiSummary(title, lang){
  try{
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { 'accept':'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    // preferimos 'extract' breve
    let text = data.extract || '';
    if (!text) return null;
    // Limpieza mínima
    text = text.replace(/\s+/g,' ').trim();
    // Evita encabezados muy técnicos para el usuario
    return text;
  }catch{ return null; }
}

function genericSummary(term, lang){
  const base = {
    es: t => `Sobre “${t}”: es un ingrediente/alimento habitual en cocina. ¿Quieres enfoque culinario (usos, técnicas, maridajes) o nutricional (macro/micronutrientes y precauciones)?`,
    en: t => `About “${t}”: a common culinary ingredient/food. Would you like a culinary angle (uses, techniques, pairings) or nutritional (macro/micronutrients, cautions)?`,
    ca: t => `Sobre “${t}”: és un ingredient/aliment comú en cuina. Vols enfocament culinari (usos, tècniques, maridatges) o nutricional (macro/micronutrients i precaucions)?`
  };
  return (base[lang]||base.es)(term);
}
