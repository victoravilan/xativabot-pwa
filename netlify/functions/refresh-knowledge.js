export const config = { schedule: "0 6 * * *" }; // cada día 06:00
export default async () => {
  // 1) Precalentar fichas de ingredientes “top” a Netlify Blobs
  // 2) Guardar últimos recalls de openFDA (global) para cache
  // 3) (Próximo) Cargar tabla de temporada a partir de tu CSV/JSON curado
};
