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

{
  "meta": { "country": "ES", "months": [1,2,3,4,5,6,7,8,9,10,11,12] },
  "produce": [
    { "id": "alcachofa", "kind": "veg", "name": {"es":"alcachofa","en":"artichoke","ca":"carxofa"}, "months": [1,2,3,11,12] },
    { "id": "berenjena", "kind": "veg", "name": {"es":"berenjena","en":"eggplant","ca":"albergínia"}, "months": [6,7,8,9,10] },
    { "id": "calabacin", "kind": "veg", "name": {"es":"calabacín","en":"courgette","ca":"carbassó"}, "months": [5,6,7,8,9,10] },
    { "id": "calabaza", "kind": "veg", "name": {"es":"calabaza","en":"pumpkin","ca":"carabassa"}, "months": [9,10,11,12,1,2] },
    { "id": "cebolla", "kind": "veg", "name": {"es":"cebolla","en":"onion","ca":"ceba"}, "months": [5,6,7,8,9,10,11,12] },
    { "id": "cebolleta", "kind": "veg", "name": {"es":"cebolleta","en":"spring onion","ca":"cebolleta"}, "months": [3,4,5] },
    { "id": "coliflor", "kind": "veg", "name": {"es":"coliflor","en":"cauliflower","ca":"coliflor"}, "months": [11,12,1,2,3,4] },
    { "id": "brocoli", "kind": "veg", "name": {"es":"brócoli","en":"broccoli","ca":"bròquil"}, "months": [10,11,12,1,2,3,4] },
    { "id": "esparrago", "kind": "veg", "name": {"es":"espárrago","en":"asparagus","ca":"espàrrec"}, "months": [3,4,5] },
    { "id": "espinaca", "kind": "veg", "name": {"es":"espinaca","en":"spinach","ca":"espinac"}, "months": [11,12,1,2,3,4] },
    { "id": "acelga", "kind": "veg", "name": {"es":"acelga","en":"chard","ca":"bledes"}, "months": [10,11,12,1,2,3,4,5] },
    { "id": "lechuga", "kind": "veg", "name": {"es":"lechuga","en":"lettuce","ca":"enciam"}, "months": [3,4,5,6,10,11] },
    { "id": "pimiento", "kind": "veg", "name": {"es":"pimiento","en":"pepper","ca":"pebrot"}, "months": [6,7,8,9,10] },
    { "id": "tomate", "kind": "veg", "name": {"es":"tomate","en":"tomato","ca":"tomàquet"}, "months": [6,7,8,9,10] },
    { "id": "pepino", "kind": "veg", "name": {"es":"pepino","en":"cucumber","ca":"cogombre"}, "months": [5,6,7,8,9] },
    { "id": "zanahoria", "kind": "veg", "name": {"es":"zanahoria","en":"carrot","ca":"pastanaga"}, "months": [10,11,12,1,2,3,4,5] },
    { "id": "puerro", "kind": "veg", "name": {"es":"puerro","en":"leek","ca":"porro"}, "months": [10,11,12,1,2,3,4] },
    { "id": "remolacha", "kind": "veg", "name": {"es":"remolacha","en":"beetroot","ca":"remolatxa"}, "months": [5,6,7,8,9,10] },
    { "id": "patata", "kind": "veg", "name": {"es":"patata","en":"potato","ca":"creïlla"}, "months": [5,6,7,8,9,10,11] },
    { "id": "fresa", "kind": "fruit", "name": {"es":"fresa","en":"strawberry","ca":"maduixa"}, "months": [3,4,5,6] },
    { "id": "cereza", "kind": "fruit", "name": {"es":"cereza","en":"cherry","ca":"cirera"}, "months": [5,6] },
    { "id": "albaricoque", "kind": "fruit", "name": {"es":"albaricoque","en":"apricot","ca":"albercoc"}, "months": [5,6,7] },
    { "id": "melocoton", "kind": "fruit", "name": {"es":"melocotón","en":"peach","ca":"préssec"}, "months": [6,7,8,9] },
    { "id": "nectarina", "kind": "fruit", "name": {"es":"nectarina","en":"nectarine","ca":"nectarina"}, "months": [6,7,8,9] },
    { "id": "ciruela", "kind": "fruit", "name": {"es":"ciruela","en":"plum","ca":"pruna"}, "months": [6,7,8,9] },
    { "id": "sandia", "kind": "fruit", "name": {"es":"sandía","en":"watermelon","ca":"síndria"}, "months": [6,7,8,9] },
    { "id": "melon", "kind": "fruit", "name": {"es":"melón","en":"melon","ca":"meló"}, "months": [6,7,8,9] },
    { "id": "uva", "kind": "fruit", "name": {"es":"uva","en":"grape","ca":"raïm"}, "months": [8,9,10] },
    { "id": "manzana", "kind": "fruit", "name": {"es":"manzana","en":"apple","ca":"poma"}, "months": [9,10,11,12,1,2] },
    { "id": "pera", "kind": "fruit", "name": {"es":"pera","en":"pear","ca":"pera"}, "months": [8,9,10,11] },
    { "id": "caqui", "kind": "fruit", "name": {"es":"caqui","en":"persimmon","ca":"cacauet/caqui"}, "months": [10,11,12] },
    { "id": "granada", "kind": "fruit", "name": {"es":"granada","en":"pomegranate","ca":"magrana"}, "months": [9,10,11,12] },
    { "id": "naranja", "kind": "fruit", "name": {"es":"naranja","en":"orange","ca":"taronja"}, "months": [11,12,1,2,3,4] },
    { "id": "mandarina", "kind": "fruit", "name": {"es":"mandarina","en":"tangerine","ca":"mandarina"}, "months": [10,11,12,1,2] },
    { "id": "limon", "kind": "fruit", "name": {"es":"limón","en":"lemon","ca":"llimona"}, "months": [11,12,1,2,3,4,5] },
    { "id": "pomelo", "kind": "fruit", "name": {"es":"pomelo","en":"grapefruit","ca":"aranja/pomelo"}, "months": [11,12,1,2,3] },
    { "id": "higo", "kind": "fruit", "name": {"es":"higo","en":"fig","ca":"figa"}, "months": [8,9] },
    { "id": "chirimoya", "kind": "fruit", "name": {"es":"chirimoya","en":"cherimoya","ca":"xirimoia"}, "months": [10,11,12,1,2] },
    { "id": "kiwi", "kind": "fruit", "name": {"es":"kiwi","en":"kiwifruit","ca":"kiwi"}, "months": [11,12,1,2,3,4] },
    { "id": "platano", "kind": "fruit", "name": {"es":"plátano (Canarias)","en":"banana/plantain","ca":"plàtan"}, "months": [1,2,3,4,5,6,7,8,9,10,11,12] },
    { "id": "aguacate", "kind": "fruit", "name": {"es":"aguacate","en":"avocado","ca":"alvocat"}, "months": [11,12,1,2,3,4] },
    { "id": "mango", "kind": "fruit", "name": {"es":"mango (tropical Málaga)","en":"mango","ca":"mango"}, "months": [9,10,11] }
  ]
}


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
