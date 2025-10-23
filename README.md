
# AU Property Orientation Dashboard

This project scrapes or ingests **Australian property sales data** (from CSV or scraped results), enriches it with **Mapbox geocoding** and **OpenStreetMap orientation context**, and visualizes results in a browser-based dashboard.

---

## 🧩 Features

- **Automatic geocoding** of property addresses using the Mapbox Geocoding API  
- **Orientation estimation** from OpenStreetMap building footprints and nearest roads  
- **Solar score** estimation (north-facing bias metric)  
- **Interactive dashboard** (Leaflet + Chart.js) with map markers and polar chart  
- **Debug-friendly logging** and fallback handling for failed geocodes  
- Works with any Node.js ≥ 18 (native fetch)  
- Uses `.env` for credentials and file configuration  

---

## 📁 Project Structure

```
au-property-orientation/
├── src/
│   ├── bootstrap.js           # Ensures fetch + dotenv are loaded
│   ├── geocode.js             # Mapbox geocoding logic
│   ├── overpass.js            # OpenStreetMap Overpass API queries
│   ├── orientation.js         # Orientation + solar score calculations
│   ├── pipeline.js            # CSV ingest, enrichment, and export
│   ├── server.js              # Express dashboard server
│   ├── smoke.js               # Simple test to verify geocoding works
│   └── debug.js               # Diagnostic mode for environment/debugging
├── public/
│   └── index.html             # Leaflet + Chart.js dashboard UI
├── dummy_properties.csv       # Example input dataset
├── .env                       # Configuration (MAPBOX_TOKEN etc.)
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

---

## ⚙️ Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit the `.env` file in the project root:

```ini
MAPBOX_TOKEN=pk.your_mapbox_token_here
INPUT_CSV=./dummy_properties.csv
OUTPUT_CSV=./output_with_orientation.csv
GEOCODE_LOG=1
RENDER_NON_OK=1
PORT=8080
```

> ⚠️ Make sure your Mapbox token has **`geocoding:read`** scope and no domain restriction.  
> Don’t wrap the value in quotes.

### 3. Test your token (optional)
```bash
npm run debug
```
This runs a single test geocode (`1 Collins St, Melbourne VIC`) and prints the results.

---

## 🚀 Run the pipeline

### Step 1 — Ingest data
```bash
npm run ingest
```
This reads your `INPUT_CSV`, geocodes each address, enriches with OSM data, and saves `OUTPUT_CSV`.

At the end you’ll see a summary like:
```
Ingest complete → OK:8 NO_GEOCODE:1 NO_BUILDING_OR_ROAD:3 ERROR:0
```

### Step 2 — Launch dashboard
```bash
npm run serve
```
Then open:

- 🌐 http://localhost:8080 → Main dashboard  
- 📊 http://localhost:8080/api/data → JSON output  
- ❤️ http://localhost:8080/health → Health check with row counts

---

## 🗺️ Dashboard Overview

- **Green markers:** High-confidence orientations  
- **Yellow markers:** Medium confidence  
- **Red markers:** Low confidence  
- **Grey markers:** Failed geocodes or incomplete OSM data  
- **Polar chart:** Orientation distribution (e.g., how many face north)  
- **Summary metric:** % of homes with north-facing rears

---

## 🧪 Debugging & Diagnostics

### Enable detailed logs
```bash
set GEOCODE_DEBUG=1   # PowerShell
export GEOCODE_DEBUG=1   # macOS/Linux
npm run ingest
```
You’ll see raw URLs and reasons for `null` responses.

### Check the token is loaded
```bash
node -e "require('dotenv').config(); console.log((process.env.MAPBOX_TOKEN||'').slice(0,12))"
```
Should output something like `pk.abc123...`.

### Inspect geocode errors
If `GEOCODE_LOG=1` is set, a `geocode_errors.log` file will appear listing each failed address and reason.

### Validate Overpass responses
If all geocodes are OK but orientations fail, the Overpass API might be throttling or the area has no building polygons nearby. Increase the radius in `fetchOSMContext()` inside `src/overpass.js` (default: 200 m).

---

## 🧭 Metrics for Property Investors

The `solar_score` (0–100) estimates how north-facing a property’s rear is—north-facing rears receive more sunlight year-round in Australia, generally boosting value and energy efficiency.  
The dashboard summarizes the percentage of properties likely to have **north-facing rears**.

Possible future extensions:

- Filter by suburb, year sold, or price range  
- Add building area or aspect ratio  
- Compute time-on-market vs solar advantage

---

## 🧰 Scripts Reference

| Script | Description |
|--------|--------------|
| `npm run ingest` | Process CSV and enrich data |
| `npm run serve` | Serve dashboard on local port |
| `npm run debug` | Smoke test for geocoding and environment |
| `npm run test` *(optional)* | Add your own Node tests here |

---

## 💡 Tips

- Always wait ~0.5 s between API calls (Mapbox rate limits).  
- Use small CSV batches first.  
- You can drop any `output_with_orientation.csv` back into Excel or GIS tools for further analysis.  
- `RENDER_NON_OK=1` in `.env` helps visualize failed rows for debugging.  

---

## 🧼 Troubleshooting

| Symptom | Likely Cause | Fix |
|----------|--------------|-----|
| `NO_GEOCODE` | Missing or invalid Mapbox token | Check `.env` and run `npm run debug` |
| `NO_BUILDING_OR_ROAD` | OSM lacks data nearby | Increase search radius or try another area |
| `fetch is not defined` | Node < 18 | Install `undici` and import in `bootstrap.js` |
| Dashboard blank | No OK rows in output | Enable `RENDER_NON_OK=1` to show grey markers |

---

## 📜 License & Credits

MIT License — © 2025 Derek Robertson  
Uses [Mapbox](https://www.mapbox.com/) Geocoding API and [OpenStreetMap](https://www.openstreetmap.org/) data.

---

## 🧭 Example Result

When configured correctly, your output CSV will look like:

```csv
address,suburb,state,postcode,soldDate,lat,lon,orientation_deg,orientation_cardinal,solar_score,confidence,status
1 Collins St,Melbourne,VIC,3000,2025-06-10,-37.8136,144.9736,135,SE,72,HIGH,OK
```

And the dashboard map will show each property with its orientation and solar rating.