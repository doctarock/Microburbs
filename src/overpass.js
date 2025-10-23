// Fetch building polygon + nearby roads from OSM (Overpass)
export async function fetchOSMContext(lat, lon, radius = 180) {
  const query = `
  [out:json][timeout:25];
  (
    way(around:${radius},${lat},${lon})["building"];
    relation(around:${radius},${lat},${lon})["building"];
    way(around:${radius},${lat},${lon})["highway"]["highway"~"residential|tertiary|secondary|primary|unclassified|service"];
  );
  out geom tags;
  `;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ data: query })
  });
  if (!res.ok) throw new Error(`Overpass error ${res.status}`);
  const data = await res.json();
  return data.elements || [];
}
