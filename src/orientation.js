import * as turf from '@turf/turf';

function normalize(deg){ return (deg % 360 + 360) % 360; }
function toCardinal(deg){
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const idx = Math.round(normalize(deg)/22.5) % 16;
  return dirs[idx];
}
function angularDistance(a,b){ 
  const d = Math.abs(normalize(a)-normalize(b));
  return d > 180 ? 360-d : d;
}

function nearestBuildingPolygon(elements, lat, lon){
  const pt = turf.point([lon, lat]);
  let best = null, bestD = Infinity;
  for (const el of elements) {
    if (!(el.type === 'way' || el.type === 'relation')) continue;
    if (!el.tags?.building) continue;
    const coords = (el.geometry || []).map(g => [g.lon, g.lat]);
    if (coords.length < 3) continue;
    const ring = coords[0][0] === coords.at(-1)[0] && coords[0][1] === coords.at(-1)[1] ? coords : coords.concat([coords[0]]);
    const poly = turf.polygon([ring]);
    const d = turf.distance(pt, turf.centroid(poly));
    if (d < bestD){ bestD = d; best = poly; }
  }
  return best;
}

function nearestRoadBearing(elements, lat, lon, buildingCentroid) {
  const pt = turf.point([lon, lat]);
  let best = null;
  let bestDist = Infinity;
  for (const el of elements) {
    if (!(el.type === 'way')) continue;
    if (!el.tags?.highway) continue;
    const coords = (el.geometry || []).map(g => [g.lon, g.lat]);
    if (coords.length < 2) continue;
    const line = turf.lineString(coords);
    const snapped = turf.nearestPointOnLine(line, buildingCentroid || pt);
    const idx = Math.max(0, Math.min(snapped.properties.index, coords.length - 2));
    const a = coords[idx], b = coords[idx+1] || coords[idx];
    const segBearing = turf.bearing(turf.point(a), turf.point(b));
    const dist = snapped.properties.dist; // km
    if (dist < bestDist) { bestDist = dist; best = { line, segBearing, snapped }; }
  }
  return best;
}

export function inferOrientation(buildingPoly, roadContext) {
  if (!buildingPoly || !roadContext) return { confidence: 'LOW' };

  const centroid = turf.centroid(buildingPoly);
  const c = centroid.geometry.coordinates; // [lon,lat]
  const nearestPt = roadContext.snapped.geometry.coordinates; // [lon,lat]
  const towardHouse = turf.bearing(turf.point(nearestPt), turf.point(c));

  const candidates = [normalize(roadContext.segBearing + 90), normalize(roadContext.segBearing - 90)];
  const best = candidates
    .map(d => ({deg: d, diff: angularDistance(d, towardHouse)}))
    .sort((a,b)=>a.diff - b.diff)[0];

  const area = turf.area(buildingPoly); // m2
  const roadKm = roadContext.snapped.properties.dist || 0;
  const conf = (area > 60 && roadKm < 0.02) ? 'HIGH' : (area > 40 && roadKm < 0.05) ? 'MED' : 'LOW';

  const rearDeg = normalize(best.deg + 180);
  const toNorth = angularDistance(rearDeg, 0);
  const solarScore = Math.round((1 - Math.min(toNorth, 90)/90) * 100); // 0..100

  return {
    orientation_deg: best.deg,
    orientation_cardinal: toCardinal(best.deg),
    solar_score: solarScore,
    confidence: conf
  };
}

export function selectBuildingAndRoad(elements, lat, lon){
  const building = nearestBuildingPolygon(elements, lat, lon);
  if (!building) return { building: null, road: null };
  const road = nearestRoadBearing(elements, lat, lon, turf.centroid(building));
  return { building, road };
}
