// netlify/functions/knowledge.js
export default async (req) => {
  const { searchParams } = new URL(req.url);
  const ingredient = (searchParams.get('ingredient') || '').trim();
  const lang = (searchParams.get('lang') || 'es').toLowerCase();

  if (!ingredient) {
    return json(400, { error: 'Missing ?ingredient' });
  }

  // 1) Nutrición (USDA FDC)
  const FDC_KEY = process.env.FDC_API_KEY || '';
  let nutrition = null, fdcSource = null;
  if (FDC_KEY) {
    try {
      const q = encodeURIComponent(ingredient);
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${q}&pageSize=1&api_key=${FDC_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const food = data?.foods?.[0];
      if (food?.foodNutrients) {
        // Buscar nutrientes clave
        const pick = (name) =>
          food.foodNutrients.find(n =>
            (n?.nutrientName || '').toLowerCase().includes(name)
          )?.value;
        nutrition = {
          per_100g: true,
          energy_kcal: pick('energy') || pick('calories') || null,
          protein_g: pick('protein') || null,
          fat_g: pick('fat') || null,
          carbs_g: pick('carbohydrate') || null,
          fiber_g: pick('fiber') || null,
        };
        fdcSource = { fdcId: food.fdcId, description: food.description };
      }
    } catch (e) { /* silencioso */ }
  }

  // 2) Alérgenos (UE/USA)
  const EU_14 = [
    'gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts',
    'celery','mustard','sesame','sulphur dioxide and sulphites','lupin','molluscs'
  ];
  const US_9 = [
    'milk','eggs','fish','crustacean shellfish','tree nuts','peanuts','wheat','soybeans','sesame'
  ];
  // Heurística simple: si el ingrediente es claramente un mayor alérgeno
  const lower = ingredient.toLowerCase();
  const isEU = EU_14.some(k => lower.includes(k.split(' ')[0]));
  const isUS = US_9.some(k => lower.includes(k.split(' ')[0]));
  const allergens = {
    eu_major_allergen: isEU ? true : false,
    us_major_allergen: isUS ? true : false,
    notes: []
  };
  if (lower.includes('almond') || lower.includes('almendra') || lower.includes('ametlla')) {
    allergens.eu_major_allergen = true; allergens.us_major_allergen = true; allergens.notes.push('Tree nuts');
  }
  if (lower.includes('peanut') || lower.includes('cacahuete') || lower.includes('cacauet')) {
    allergens.eu_major_allergen = true; allergens.us_major_allergen = true; allergens.notes.push('Peanut');
  }
  if (lower.includes('wheat') || lower.includes('trigo') || lower.includes('blat')) {
    allergens.eu_major_allergen = true; allergens.us_major_allergen = true; allergens.notes.push('Gluten/wheat');
  }
  if (lower.includes('sesame') || lower.includes('sésamo') || lower.includes('sèsam')) {
    allergens.eu_major_allergen = true; allergens.us_major_allergen = true; allergens.notes.push('Sesame');
  }

  // 3) Retiradas USA (openFDA)
  let recalls_us = [];
  try {
    const term = encodeURIComponent(ingredient);
    const url = `https://api.fda.gov/food/enforcement.json?search=product_description:${term}&limit=3`;
    const res = await fetch(url);
    const data = await res.json();
    recalls_us = (data?.results || []).map(r => ({
      recall_number: r.recall_number,
      reason: r.reason_for_recall,
      status: r.status,
      classification: r.classification,
      report_date: r.report_date,
      state: r.state,
      product_description: r.product_description
    }));
  } catch(e) { /* puede no haber matches */ }

  // 4) Búsqueda RASFF (UE)
  const rasff_search_url = `https://webgate.ec.europa.eu/rasff-window/screen/search?search=${encodeURIComponent(ingredient)}`;

  // 5) Redacción “erudita” (breve, multi-idioma)
  const texts = {
    es: (name) => `**${capitalize(name)}**: ingrediente ampliamente utilizado. Composición típica por 100 g (si procede): ${(nutrition && nutrition.energy_kcal) ? `${Math.round(nutrition.energy_kcal)} kcal` : '—'}. ${allergenLine('es')}`,
    en: (name) => `**${capitalize(name)}**: widely used ingredient. Typical composition per 100 g (when available): ${(nutrition && nutrition.energy_kcal) ? `${Math.round(nutrition.energy_kcal)} kcal` : '—'}. ${allergenLine('en')}`,
    ca: (name) => `**${capitalize(name)}**: ingredient àmpliament utilitzat. Composició típica per 100 g (si escau): ${(nutrition && nutrition.energy_kcal) ? `${Math.round(nutrition.energy_kcal)} kcal` : '—'}. ${allergenLine('ca')}`
  };
  function allergenLine(l){
    const yesEU = allergens.eu_major_allergen ? 'sí' : 'no';
    const yesUS = allergens.us_major_allergen ? 'sí' : 'no';
    if (l==='en') return `Major allergen (EU/US)? EU: ${allergens.eu_major_allergen?'yes':'no'} / US: ${allergens.us_major_allergen?'yes':'no'}.`;
    if (l==='ca') return `Al·lergen major (UE/EUA)? UE: ${yesEU} / EUA: ${yesUS}.`;
    return `¿Alérgeno mayor (UE/EE. UU.)? UE: ${yesEU} / EE. UU.: ${yesUS}.`;
  }

  const summary = texts[lang] ? texts[lang](ingredient) : texts.es(ingredient);

  return json(200, {
    ok: true,
    ingredient,
    summary,
    nutrition,
    allergens,
    recalls_us,
    rasff_search_url,
    sources: {
      fdc: fdcSource,
      openfda: 'food/enforcement',
      regs: { eu_1169_2011: true, us_falcpf_faster: true }
    }
  });
};

function json(status, body){ return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' }}) }
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1) }
