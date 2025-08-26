// netlify/functions/season.js
const SEED_ES = {
  // Muy abreviado a modo de ejemplo; completa cuando quieras con la tabla MAPA.
  1: { fruit: ["naranja","mandarina","pomelo","kiwi","manzana","pera"], veg: ["acelga","alcachofa","brócoli","col","espinaca","puerro"] },
  2: { fruit: ["naranja","mandarina","pomelo","kiwi","manzana","pera"], veg: ["acelga","alcachofa","brócoli","coliflor","espinaca","zanahoria"] },
  3: { fruit: ["fresa","fresón","naranja","limón"], veg: ["alcachofa","espárrago verde","guisante","haba","lechuga"] },
  4: { fruit: ["fresa","albaricoque (tarde)"], veg: ["espárrago verde","guisante","haba","pepino"] },
  5: { fruit: ["albaricoque","cereza (tarde)","fresa"], veg: ["calabacín","pepino","judía verde"] },
  6: { fruit: ["cereza","melocotón","paraguaya","nectarina","melón","sandía"], veg: ["tomate","pepino","pimiento"] },
  7: { fruit: ["melón","sandía","melocotón","nectarina","ciruela","higo"], veg: ["tomate","pepino","pimiento","calabacín"] },
  8: { fruit: ["melón","sandía","higo","uva (tarde)","melocotón"], veg: ["tomate","pimiento","berenjena"] },
  9: { fruit: ["uva","higo","granada","manzana","pera","mango (import)"], veg: ["berenjena","calabaza","espinaca","judía verde"] },
 10: { fruit: ["caqui","granada","manzana","pera","uva","mango (import)"], veg: ["acelga","calabaza","brócoli","coliflor"] },
 11: { fruit: ["caqui","kiwi","manzana","pera","granada","mandarina","naranja"], veg: ["acelga","col","brócoli","coliflor","espinaca","puerro","remolacha"] },
 12: { fruit: ["kiwi","manzana","pera","mandarina","naranja","pomelo"], veg: ["acelga","col","brócoli","coliflor","espinaca","puerro"] }
};

export default async (req) => {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get('country') || 'ES').toUpperCase();
  const month = Math.min(12, Math.max(1, parseInt(searchParams.get('month')||'0',10)||new Date().getMonth()+1));
  const lang = (searchParams.get('lang') || 'es').toLowerCase();

  if (country !== 'ES') {
    return json(400, { error: 'Only ES supported initially' });
  }

  const data = SEED_ES[month] || { fruit: [], veg: [] };

  const links = {
    eufic: "https://www.eufic.org/en/explore-seasonal-fruit-and-vegetables-in-europe",
    ec_calendar: "https://agriculture.ec.europa.eu/farming/crop-productions-and-plant-based-products/fruit-and-vegetables/fruit-and-vegetables-calendar_en",
    mapa_fruit: "https://www.mapa.gob.es/dam/mapa/contenido/alimentacion/temas/estrategia-desperdicios/nueva-web-2022/5.-sensibilizacion/5.4-infografias/documentos-infografias/12calendario_frutas_completo.pdf",
    mapa_veg: "https://www.mapa.gob.es/dam/mapa/contenido/alimentacion/temas/estrategia-desperdicios/nueva-web-2022/5.-sensibilizacion/5.4-infografias/documentos-infografias/11calendario_verduras_completo.pdf"
  };

  const monthName = new Intl.DateTimeFormat(lang, { month: 'long' }).format(new Date(2000, month-1, 1));

  const titles = {
    es: (m)=>`Producto de temporada en España (${m}):`,
    en: (m)=>`Seasonal produce in Spain (${m}):`,
    ca: (m)=>`Producte de temporada a Espanya (${m}):`
  };

  return json(200, {
    ok: true,
    country,
    month,
    title: (titles[lang]||titles.es)(capitalize(monthName)),
    fruit: data.fruit,
    vegetables: data.veg,
    refs: links
  });
};

function json(status, body){ return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' }}) }
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1) }
