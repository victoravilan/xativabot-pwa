// netlify/functions/knowledge.js
// Resumen breve (Wikipedia REST) + Nutrición aproximada + Maridajes + Técnicas + Precauciones.
// Multilengua ES/EN/CA. Sin citar fuentes en la respuesta (cumple tu requisito).

// --- Nutrición (aprox./100g). Se puede ampliar fácilmente ---
const NUTRITION = {
  arroz:            { energy_kcal: 130, protein_g: 2.7, fat_g: 0.3, carbs_g: 28 }, // blanco cocido
  "arroz blanco":   { energy_kcal: 130, protein_g: 2.7, fat_g: 0.3, carbs_g: 28 },
  "aceite de oliva":{ energy_kcal: 884, protein_g: 0,   fat_g: 100, carbs_g: 0 },
  "olive oil":      { energy_kcal: 884, protein_g: 0,   fat_g: 100, carbs_g: 0 },
  tomate:           { energy_kcal: 18,  protein_g: 0.9, fat_g: 0.2, carbs_g: 3.9 },
  tomato:           { energy_kcal: 18,  protein_g: 0.9, fat_g: 0.2, carbs_g: 3.9 },
  ajo:              { energy_kcal: 149, protein_g: 6.4, fat_g: 0.5, carbs_g: 33 },
  garlic:           { energy_kcal: 149, protein_g: 6.4, fat_g: 0.5, carbs_g: 33 },
  cebolla:          { energy_kcal: 40,  protein_g: 1.1, fat_g: 0.1, carbs_g: 9.3 },
  onion:            { energy_kcal: 40,  protein_g: 1.1, fat_g: 0.1, carbs_g: 9.3 },
  "pimienta negra": { energy_kcal: 251, protein_g: 10,  fat_g: 3.3, carbs_g: 64 },
  "black pepper":   { energy_kcal: 251, protein_g: 10,  fat_g: 3.3, carbs_g: 64 },
  cúrcuma:          { energy_kcal: 312, protein_g: 9.7, fat_g: 3.3, carbs_g: 67 },
  turmeric:         { energy_kcal: 312, protein_g: 9.7, fat_g: 3.3, carbs_g: 67 },
  canela:           { energy_kcal: 247, protein_g: 4,   fat_g: 1.2, carbs_g: 81 },
  cinnamon:         { energy_kcal: 247, protein_g: 4,   fat_g: 1.2, carbs_g: 81 },
  comino:           { energy_kcal: 375, protein_g: 17.8,fat_g: 22,  carbs_g: 44 },
  cumin:            { energy_kcal: 375, protein_g: 17.8,fat_g: 22,  carbs_g: 44 },
  azafrán:          { energy_kcal: 310, protein_g: 11,  fat_g: 6,   carbs_g: 65 },
  saffron:          { energy_kcal: 310, protein_g: 11,  fat_g: 6,   carbs_g: 65 },
  sal:              { energy_kcal: 0,   protein_g: 0,   fat_g: 0,   carbs_g: 0 },
  salt:             { energy_kcal: 0,   protein_g: 0,   fat_g: 0,   carbs_g: 0 }
};

// --- Base curada: maridajes, técnicas y precauciones por ingrediente clave ---
const DB = {
  // genérico “especias”
  especias: {
    pairings: {
      es: ["Cítricos y pieles (realzan aromas)", "Ajo, cebolla, sofrito", "Yogur, coco, frutos secos", "Arroz, legumbres", "Carnes blancas y pescado (especias suaves)", "Caza y asados (especias cálidas)"],
      en: ["Citrus zest", "Garlic/onion/sofrito", "Yogurt, coconut, nuts", "Rice, pulses", "White meats & fish (gentle spices)", "Game & roasts (warm spices)"],
      ca: ["Pells cítriques", "All, ceba, sofregit", "Iogurt, coco, fruits secs", "Arròs, llegums", "Carns blanques i peix (espècies suaus)", "Caça i rostits (espècies càlides)"]
    },
    techniques: {
      es: ["Tostar en seco para despertar aceites volátiles", "‘Florecer’ especias molidas en grasa caliente", "Moler justo antes de usar", "Templar en el sofrito, evitar quemar el pimentón"],
      en: ["Dry-toast to bloom volatile oils", "Bloom ground spices in hot fat", "Grind just before use", "Warm in the soffritto, avoid burning paprika"],
      ca: ["Torrar en sec per obrir aromes", "Fer florir espècies mòltes en greix calent", "Moldre just abans d’emprar", "Temperar al sofregit; no cremar el pebre roig"]
    },
    cautions: {
      es: "Evita quemar especias: amargan. Revisa alergias a frutos secos/mostaza/sésamo.",
      en: "Avoid scorching spices: they turn bitter. Check nut/mustard/sesame allergies.",
      ca: "Evita cremar espècies: amarguen. Revisa al·lèrgies a fruits secs/mostassa/sèsam."
    }
  },
  arroz: {
    pairings: {
      es: ["Sofrito (ajo, cebolla, tomate)", "Caldo claro y azafrán", "Mariscos o carnes blancas", "Verduras de temporada (alcachofa, pimiento)", "Alioli (fideuà y arroces secos)"],
      en: ["Sofritto (garlic, onion, tomato)", "Light stock & saffron", "Shellfish or white meats", "Seasonal vegetables (artichoke, pepper)", "Allioli (dry noodle/rice dishes)"],
      ca: ["Sofregit (all, ceba, tomaca)", "Brou clar i safrà", "Marisc o carns blanques", "Verdures de temporada (carxofa, pebre)", "Allioli (secs)"]
    },
    techniques: {
      es: ["Nacarar el arroz tras el sofrito", "Relación caldo/arroz y punto de ebullición", "No remover en arroces secos (socarrat)", "Reposo 3–5 min fuera del fuego"],
      en: ["Pearl rice after soffritto", "Broth-to-rice ratio & steady boil", "Do not stir in dry paella (socarrat)", "Rest 3–5 min off heat"],
      ca: ["Nacar l’arròs després del sofregit", "Relació brou/arròs i bull suau", "No remenar en secs (socarrat)", "Repòs 3–5 min"]
    },
    cautions: {
      es: "Enfriar rápido el arroz cocido si no se consume; conservar ≤5 °C.",
      en: "Cool cooked rice quickly if not served; store ≤5 °C.",
      ca: "Refredar ràpid l’arròs cuit si no es menja; conservar ≤5 °C."
    }
  },
  "aceite de oliva": {
    pairings: {
      es: ["Tomate, ajo, pan", "Pescados blancos y verduras asadas", "Cítricos y hierbas mediterráneas"],
      en: ["Tomato, garlic, bread", "White fish & roasted vegetables", "Citrus and Mediterranean herbs"],
      ca: ["Tomaca, all, pa", "Peixos blancs i verdures rostides", "Cítrics i herbes mediterrànies"]
    },
    techniques: {
      es: ["Emulsionar (alioli, mayonesa)", "Confitar suave (ajos, bacalao)", "Acabado en crudo para perfume"],
      en: ["Emulsify (aioli, mayo)", "Gentle confit (garlic, cod)", "Finish raw for aroma"],
      ca: ["Emulsionar (allioli, maionesa)", "Confit suau (alls, bacallà)", "Acabat en cru per perfum"]
    },
    cautions: {
      es: "No recalentar repetidas veces; degradación y sabores rancios.",
      en: "Avoid repeated reheating; degradation/off-flavors.",
      ca: "Evita reescalfats repetits; degradació i ranci."
    }
  },
  ajo: {
    pairings: {
      es: ["Aceite de oliva, tomate, perejil", "Mariscos, cordero", "Pimentón, guindilla"],
      en: ["Olive oil, tomato, parsley", "Seafood, lamb", "Paprika, chili"],
      ca: ["Oli d’oliva, tomaca, julivert", "Marisc, anyell", "Pebre roig, bitxo"]
    },
    techniques: {
      es: ["Dorar láminas sin quemar", "Confitado suave", "Aromatizar aceite"],
      en: ["Slice & lightly brown", "Gentle confit", "Infuse oil"],
      ca: ["Làmines daurades sense cremar", "Confit suau", "Perfumar oli"]
    },
    cautions: {
      es: "Evita dorado oscuro: amarga. Ajo crudo es potente; ajusta.",
      en: "Avoid dark browning: bitter. Raw garlic is strong; adjust.",
      ca: "Evita torrat fosc: amarg. All cru és potent; ajusta."
    }
  },
  cebolla: {
    pairings: {
      es: ["Mantequilla/aceite, tomillo/laurel", "Carnes estofadas, quesos", "Vinagres suaves"],
      en: ["Butter/oil, thyme/bay", "Stews, cheeses", "Gentle vinegars"],
      ca: ["Mantega/oli, farigola/llorer", "Estofats, formatges", "Vinagres suaus"]
    },
    techniques: {
      es: ["Sudado (transparente)", "Caramelización lenta", "Pickles rápidos"],
      en: ["Sweating (translucent)", "Slow caramelization", "Quick pickles"],
      ca: ["Suat (transparent)", "Caramel·lització lenta", "Escabetx ràpid"]
    },
    cautions: {
      es: "Azúcares se queman fácil: controla fuego.",
      en: "Sugars scorch easily: control heat.",
      ca: "Els sucres es cremen: controla el foc."
    }
  },
  tomate: {
    pairings: {
      es: ["Aceite de oliva, ajo, albahaca/orégano", "Quesos frescos, anchoa", "Vinagre suave"],
      en: ["Olive oil, garlic, basil/oregano", "Fresh cheese, anchovy", "Mild vinegar"],
      ca: ["Oli d’oliva, all, alfàbega/orenga", "Formatge fresc, anxova", "Vinagre suau"]
    },
    techniques: {
      es: ["Escaldar y pelar", "Asar para concentrar", "Confitar en aceite"],
      en: ["Score & peel", "Roast to concentrate", "Confit in oil"],
      ca: ["Escaldar i pelar", "Enfornar per concentrar", "Confitar en oli"]
    },
    cautions: {
      es: "Evita sobrecocción en salsas si buscas frescor.",
      en: "Avoid overcooking sauces if freshness desired.",
      ca: "Evita sobrecoure si busques frescor."
    }
  },
  "pimienta negra": {
    pairings: {
      es: ["Carnes a la plancha", "Quesos curados", "Fresas/cítricos (pimienta fresca)"],
      en: ["Grilled meats", "Aged cheeses", "Strawberries/citrus (fresh crack)"],
      ca: ["Carns a la graella", "Formatges curats", "Maduixes/cítrics (mòlta fresca)"]
    },
    techniques: {
      es: ["Moler al final para aroma", "Tostar granos y machacar", "Infusionar en salsas"],
      en: ["Crack at the end", "Toast & crush", "Infuse in sauces"],
      ca: ["Moldre al final", "Torrar i aixafar", "Infusionar a salses"]
    },
    cautions: {
      es: "Demasiada reduce sutileza; ajusta al servicio.",
      en: "Excess dulls nuance; season at service.",
      ca: "En excés tapa sabors; rectifica al servei."
    }
  },
  cúrcuma: {
    pairings: {
      es: ["Coco, jengibre, comino", "Legumbres y arroz", "Caldo de pollo/verduras"],
      en: ["Coconut, ginger, cumin", "Pulses & rice", "Chicken/veg stock"],
      ca: ["Coco, gingebre, comí", "Llegums i arròs", "Brou d’au/verdures"]
    },
    techniques: {
      es: ["Florecer en grasa 30–60 s", "Añadir temprano para color", "Usar fresca rallada (si disponible)"],
      en: ["Bloom in fat 30–60 s", "Add early for color", "Use fresh grated if available"],
      ca: ["Fer florir en greix 30–60 s", "Afegir prompte per color", "Fresca ratllada si n’hi ha"]
    },
    cautions: {
      es: "Tiñe; manipula con cuidado. Sabor terroso: modera.",
      en: "Stains; handle carefully. Earthy flavor: moderate.",
      ca: "Tenyeix; ves amb compte. Gust terrós: modera."
    }
  },
  comino: {
    pairings: {
      es: ["Cordero, legumbres", "Yogur y cítricos", "Pimentón y ajo"],
      en: ["Lamb, pulses", "Yogurt & citrus", "Paprika & garlic"],
      ca: ["Anyell, llegums", "Iogurt i cítrics", "Pebre roig i all"]
    },
    techniques: {
      es: ["Tostar semillas y moler", "Bloom en grasa", "Pequeñas dosis (intenso)"],
      en: ["Toast seeds & grind", "Bloom in fat", "Use sparingly (intense)"],
      ca: ["Torrar i moldre", "Fer florir en greix", "Dosi menuda (intens)"]
    },
    cautions: {
      es: "Puede dominar; añade en capas y prueba.",
      en: "Can dominate; layer and taste.",
      ca: "Pot dominar; capes i tast."
    }
  },
  canela: {
    pairings: {
      es: ["Cítricos, vainilla", "Chocolate y café", "Cordero (cocina árabe)"],
      en: ["Citrus, vanilla", "Chocolate & coffee", "Lamb (Arab cuisines)"],
      ca: ["Cítrics, vainilla", "Xocolata i café", "Anyell (cuines àrabs)"]
    },
    techniques: {
      es: ["Usar rama para infusionar y retirar", "Moler justo antes para postres", "Tostar suave para despertar aroma"],
      en: ["Infuse with stick, remove", "Grind fresh for desserts", "Light toast to awaken aroma"],
      ca: ["Infusionar amb branca", "Moldre fresca per a dolços", "Torrat suau"]
    },
    cautions: {
      es: "No excedas en platos salados; puede dulcificar en exceso.",
      en: "Do not overdo in savory dishes; can read as sweet.",
      ca: "No excedis en salats; endolceix."
    }
  },
  azafrán: {
    pairings: {
      es: ["Arroz, caldo claro", "Pescados y mariscos", "Hinojo, cítricos"],
      en: ["Rice, light broth", "Fish & shellfish", "Fennel, citrus"],
      ca: ["Arròs, brou clar", "Peix i marisc", "Fonoll, cítrics"]
    },
    techniques: {
      es: ["Tostar hebras muy suave", "Infusionar en líquido caliente", "Añadir al caldo, no al final"],
      en: ["Very gentle thread toasting", "Infuse in hot liquid", "Add to broth, not at the end"],
      ca: ["Tostat suau del brin", "Infusionar en líquid calent", "Afegir al brou"]
    },
    cautions: {
      es: "Es potente y caro: dosifica. Evita quemar hebras.",
      en: "Potent & costly: dose carefully. Don’t scorch threads.",
      ca: "Potent i car: dosifica. No cremar brins."
    }
  }
};

// --- Normalización de términos a clave canónica por idioma ---
function normalize(term, lang){
  const t = term.toLowerCase().trim();
  const pluralFix = {
    es: { "especias":"especia", "ingredientes":"ingrediente" },
    en: { "spices":"spice", "ingredients":"ingredient" },
    ca: { "espècies":"espècia", "ingredients":"ingredient" }
  }[lang] || {};
  const base = pluralFix[t] || t;

  const keyMap = {
    es: {
      "especia":"especias", "especias":"especias",
      "arroz":"arroz", "arros":"arroz",
      "aceite de oliva":"aceite de oliva", "aceite":"aceite de oliva",
      "ajo":"ajo", "cebolla":"cebolla", "tomate":"tomate",
      "pimienta":"pimienta negra", "pimienta negra":"pimienta negra",
      "cúrcuma":"cúrcuma", "curcuma":"cúrcuma",
      "comino":"comino", "canela":"canela", "azafrán":"azafrán", "azafran":"azafrán",
      "sal":"sal"
    },
    en: {
      "spice":"especias", "spices":"especias",
      "rice":"arroz", "white rice":"arroz blanco",
      "olive oil":"aceite de oliva",
      "garlic":"ajo", "onion":"cebolla", "tomato":"tomate",
      "pepper":"pimienta negra", "black pepper":"pimienta negra",
      "turmeric":"cúrcuma", "cumin":"comino", "cinnamon":"canela", "saffron":"azafrán",
      "salt":"sal"
    },
    ca: {
      "espècia":"especias", "espècies":"especias",
      "arròs":"arroz",
      "oli d'oliva":"aceite de oliva",
      "all":"ajo", "ceba":"cebolla", "tomaca":"tomate", "tomate":"tomate",
      "pebre":"pimienta negra", "pebre negre":"pimienta negra", "pebre roig":"pimentón", // opcional
      "cúrcuma":"cúrcuma", "comí":"comino", "canel·la":"canela", "safrà":"azafrán",
      "sal":"sal"
    }
  }[lang] || {};

  const key = keyMap[base] || base;
  // Título con mayúscula inicial
  const query = base.replace(/\s+/g,' ').trim().replace(/^./, c => c.toUpperCase());
  return { key, query };
}

// --- Wikipedia summary en el idioma (REST API) ---
async function wikiSummary(title, lang){
  try{
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { 'accept':'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    let text = data.extract || '';
    if (!text) return null;
    return text.replace(/\s+/g,' ').trim();
  }catch{ return null; }
}

// --- Mensajes base por idioma ---
function i18n(lang){
  return {
    nutr:  lang==='en' ? "Approx nutrition /100 g:" : lang==='ca' ? "Nutrició aprox./100 g:" : "Nutrición aprox./100 g:",
    fallback: (t) => lang==='en'
      ? `About “${t}”: a common culinary ingredient. Want a culinary angle (uses, techniques, pairings) or nutritional (macro/micro & cautions)?`
      : lang==='ca'
      ? `Sobre “${t}”: ingredient habitual. Vols enfocament culinari (usos, tècniques, maridatges) o nutricional (macro/micro i precaucions)?`
      : `Sobre “${t}”: ingrediente habitual. ¿Quieres enfoque culinario (usos, técnicas, maridajes) o nutricional (macro/micro y precauciones)?`
  };
}

// --- Respuesta HTTP JSON ---
function json(status, body){
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export default async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const lang = (searchParams.get('lang') || 'es').toLowerCase();
    const term = (searchParams.get('ingredient') || '').trim();
    if (!term) return json(400, { error: 'Missing ingredient' });

    const { key, query } = normalize(term, lang);
    const L = i18n(lang);

    // 1) Wikipedia
    let summary = await wikiSummary(query, lang);
    if (!summary) summary = await wikiSummary(query, 'en');
    if (!summary && lang !== 'es') summary = await wikiSummary(query, 'es');
    if (!summary) summary = L.fallback(query);

    // 2) Nutrición si está mapeada
    const nutrition = NUTRITION[key] || NUTRITION[query.toLowerCase()] || null;

    // 3) Curated DB (maridajes/técnicas/precauciones)
    const node = DB[key];
    const pairings   = node?.pairings?.[lang] || node?.pairings?.es || [];
    const techniques = node?.techniques?.[lang] || node?.techniques?.es || [];
    const cautions   = node?.cautions?.[lang] || node?.cautions?.es || '';

    return json(200, {
      ok: true,
      summary,
      nutrition,
      pairings,
      techniques,
      cautions
    });
  } catch (e) {
    return json(500, { error: 'knowledge error', detail: String(e) });
  }
};
