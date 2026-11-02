/**
 * OptiRoute: Web-Based Delivery Route Optimization System (Node.js & Express.js)
 * Powered by Computational Geometry and TSP Approximation Algorithms.
 *
 * Backend Application Server with Multi-Provider API Key Integration.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

const {
  CostMatrixBuilder,
  RouteEvaluator,
  solveSimulatedAnnealing,
  solveAntColony,
  solveGeneticAlgorithm,
  solveTwoOpt,
  solveDynamicProgramming,
  convexHull,
  calculateCentroid
} = require('./algorithms');

const { loadEnvConfig, saveEnvConfig, maskKey } = require('./config');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static assets at /static
app.use('/static', express.static(path.join(__dirname, 'static')));

const PRESETS_FILE = path.join(__dirname, 'data', 'presets.json');

function loadPresetsData() {
  if (fs.existsSync(PRESETS_FILE)) {
    try {
      const content = fs.readFileSync(PRESETS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error(`Error loading presets: ${e.message}`);
    }
  }
  return { presets: [] };
}

/**
 * Fetches real road-following geometry using the configured routing engine
 * (OpenRouteService, Mapbox, Google Maps, or OSRM).
 * Falls back gracefully to geodesic coordinates if offline or key is inactive.
 * coordinates: Array of [lat, lng]
 */
async function fetchRoadGeometry(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    return coordinates;
  }

  const config = loadEnvConfig();
  const provider = (config.ACTIVE_ROUTING_PROVIDER || 'osrm').toLowerCase();

  // 1. OpenRouteService (ORS) Routing
  const orsKey = (config.OPENROUTESERVICE_API_KEY || '').trim();
  if (provider === 'openrouteservice' && orsKey && !orsKey.startsWith('demo_')) {
    try {
      // ORS accepts [[lng, lat], ...] (supports up to 100 points per request)
      const maxPoints = 100;
      const chunks = [];
      for (let i = 0; i < coordinates.length; i += maxPoints) {
        const slice = coordinates.slice(i, i + maxPoints);
        const orsCoords = slice.map((c) => [c[1], c[0]]);
        const resp = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
          method: 'POST',
          headers: {
            Authorization: orsKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ coordinates: orsCoords }),
          signal: AbortSignal.timeout(4000)
        });
        if (resp.ok) {
          const data = await resp.json();
          const rawCoords = data.features?.[0]?.geometry?.coordinates || [];
          for (const c of rawCoords) {
            chunks.push([c[1], c[0]]);
          }
        }
      }
      if (chunks.length > 0) return chunks;
      if (resp.ok) {
        const data = await resp.json();
        const features = data.features || [];
        if (features.length > 0 && features[0].geometry) {
          const rawCoords = features[0].geometry.coordinates;
          return rawCoords.map((c) => [c[1], c[0]]);
        }
      }
    } catch (e) {
      console.warn(`ORS routing fallback: ${e.message}`);
    }
  }

  // 2. Mapbox Directions API
  const mapboxToken = (config.MAPBOX_ACCESS_TOKEN || '').trim();
  if (provider === 'mapbox' && mapboxToken && !mapboxToken.endsWith('.demo_key')) {
    try {
      const coordStr = coordinates
        .slice(0, 100)
        .map((c) => `${c[1].toFixed(6)},${c[0].toFixed(6)}`)
        .join(';');
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (resp.ok) {
        const data = await resp.json();
        if (data.routes && data.routes.length > 0) {
          const rawCoords = data.routes[0].geometry.coordinates;
          return rawCoords.map((c) => [c[1], c[0]]);
        }
      }
    } catch (e) {
      console.warn(`Mapbox routing fallback: ${e.message}`);
    }
  }

  // 3. Public OSRM (Open Source Routing Machine)
  try {
    const coordStrings = coordinates
      .slice(0, 100)
      .map((c) => `${c[1].toFixed(6)},${c[0].toFixed(6)}`)
      .join(';');
    const url = `http://router.project-osrm.org/route/v1/driving/${coordStrings}?overview=full&geometries=geojson`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const geojsonCoords = data.routes[0].geometry.coordinates;
        return geojsonCoords.map((c) => [c[1], c[0]]);
      }
    }
  } catch (e) {
    // Silent fallback to direct coordinates
  }

  // Direct fallback
  return coordinates;
}

// Serve Main Web Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// API: Get Configuration
app.get('/api/config', (req, res) => {
  const cfg = loadEnvConfig();
  res.json({
    active_provider: cfg.ACTIVE_ROUTING_PROVIDER || 'osrm',
    openrouteservice_key_configured: Boolean(cfg.OPENROUTESERVICE_API_KEY),
    openrouteservice_key_masked: maskKey(cfg.OPENROUTESERVICE_API_KEY || ''),
    mapbox_token_configured: Boolean(cfg.MAPBOX_ACCESS_TOKEN),
    mapbox_token_masked: maskKey(cfg.MAPBOX_ACCESS_TOKEN || ''),
    google_maps_key_configured: Boolean(cfg.GOOGLE_MAPS_API_KEY),
    google_maps_key_masked: maskKey(cfg.GOOGLE_MAPS_API_KEY || ''),
    geoapify_key_configured: Boolean(cfg.GEOAPIFY_API_KEY),
    geoapify_key_masked: maskKey(cfg.GEOAPIFY_API_KEY || '')
  });
});

// API: Update Configuration
app.post('/api/config', (req, res) => {
  const payload = req.body || {};
  const updates = {};

  if (payload.active_provider) {
    updates.ACTIVE_ROUTING_PROVIDER = payload.active_provider;
  }
  if (typeof payload.openrouteservice_key === 'string' && payload.openrouteservice_key.trim()) {
    updates.OPENROUTESERVICE_API_KEY = payload.openrouteservice_key.trim();
  }
  if (typeof payload.mapbox_token === 'string' && payload.mapbox_token.trim()) {
    updates.MAPBOX_ACCESS_TOKEN = payload.mapbox_token.trim();
  }
  if (typeof payload.google_maps_key === 'string' && payload.google_maps_key.trim()) {
    updates.GOOGLE_MAPS_API_KEY = payload.google_maps_key.trim();
  }
  if (typeof payload.geoapify_key === 'string' && payload.geoapify_key.trim()) {
    updates.GEOAPIFY_API_KEY = payload.geoapify_key.trim();
  }

  saveEnvConfig(updates);
  res.json({
    status: 'success',
    message: 'API keys and configuration updated successfully.'
  });
});

// API: Geocoding
app.get('/api/geocode', async (req, res) => {
  const query = (req.query.q || '').toString().trim();
  if (!query) {
    return res.json({ results: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=5&addressdetails=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'OptiRoute-App/2.4 (contact@optiroute.local)' },
      signal: AbortSignal.timeout(4000)
    });
    if (resp.ok) {
      const data = await resp.json();
      const results = data.map((item) => ({
        name: (item.display_name || '').split(',')[0],
        full_address: item.display_name || '',
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
      return res.json({ results });
    }
  } catch (e) {
    console.error(`Geocoding error: ${e.message}`);
  }

  res.json({ results: [] });
});

// API: Get Presets
app.get('/api/presets', (req, res) => {
  res.json(loadPresetsData());
});

// API: Generate Random Delivery Stops
app.post('/api/generate_random', (req, res) => {
  const data = req.body || {};
  const depot = data.depot || { lat: 17.7089, lng: 83.1517, name: 'Central Depot' };
  const count = parseInt(data.count || 10, 10);
  const radiusKm = parseFloat(data.radius_km || 12.0);

  const centerLat = parseFloat(depot.lat || 17.7089);
  const centerLng = parseFloat(depot.lng || 83.1517);

  const trafficOptions = ['low', 'medium', 'heavy', 'severe'];
  const roadOptions = ['paved', 'urban', 'rough'];

  const generatedStops = [];
  for (let i = 1; i <= count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.sqrt(0.1 + Math.random() * 0.9) * radiusKm;

    const deltaLat = (dist * Math.cos(angle)) / 111.0;
    const deltaLng = (dist * Math.sin(angle)) / (111.0 * Math.cos((centerLat * Math.PI) / 180.0));

    const lat = Math.round((centerLat + deltaLat) * 100000) / 100000;
    const lng = Math.round((centerLng + deltaLng) * 100000) / 100000;

    generatedStops.push({
      id: `stop-rnd-${i}`,
      name: `Delivery Stop #${i}`,
      lat,
      lng,
      traffic: trafficOptions[Math.floor(Math.random() * trafficOptions.length)],
      road_condition: roadOptions[Math.floor(Math.random() * roadOptions.length)]
    });
  }

  res.json({ stops: generatedStops });
});

// API: Optimize Routes
app.post('/api/optimize', async (req, res) => {
  const payload = req.body || {};
  const locations = payload.locations || [];

  if (locations.length < 2) {
    return res.status(400).json({
      error: 'At least 1 warehouse depot and 1 delivery location are required.'
    });
  }

  const coordinateType = payload.coordinate_type || 'gps';
  const objective = payload.objective || 'balanced';
  const selectedAlgorithms = payload.algorithms || ['sa', 'aco', 'ga', 'two_opt', 'dp'];

  const weightDist = parseFloat(payload.weight_distance !== undefined ? payload.weight_distance : 0.5);
  const weightTime = parseFloat(payload.weight_time !== undefined ? payload.weight_time : 0.5);

  const matrixBuilder = new CostMatrixBuilder({
    locations,
    coordinateType,
    weightDistance: weightDist,
    weightTime: weightTime
  });

  const costMatrix = matrixBuilder.compositeCostMatrix;
  const evaluator = new RouteEvaluator(matrixBuilder);

  const rawResults = [];
  const n = locations.length;

  // 1. 2-Opt Local Search
  if (selectedAlgorithms.includes('two_opt') || selectedAlgorithms.includes('all')) {
    const res2opt = solveTwoOpt(costMatrix);
    rawResults.push(evaluator.evaluateResult(res2opt));
  }

  // 2. Simulated Annealing (SA)
  if (selectedAlgorithms.includes('sa') || selectedAlgorithms.includes('all') || selectedAlgorithms.includes('all3')) {
    const resSa = solveSimulatedAnnealing(costMatrix, {
      initialTemperature: 100.0,
      minTemperature: 1.0
    });
    rawResults.push(evaluator.evaluateResult(resSa));
  }

  // 3. Ant Colony Optimization (ACO)
  if (selectedAlgorithms.includes('aco') || selectedAlgorithms.includes('all') || selectedAlgorithms.includes('all3')) {
    const resAco = solveAntColony(costMatrix, {
      maxIterations: Math.min(120, Math.max(40, n * 5))
    });
    rawResults.push(evaluator.evaluateResult(resAco));
  }

  // 4. Genetic Algorithm (GA)
  if (selectedAlgorithms.includes('ga') || selectedAlgorithms.includes('all') || selectedAlgorithms.includes('all3')) {
    const resGa = solveGeneticAlgorithm(costMatrix, {
      generations: Math.min(100, Math.max(30, n * 4))
    });
    rawResults.push(evaluator.evaluateResult(resGa));
  }

  // 5. Exact Dynamic Programming (Held-Karp)
  if (selectedAlgorithms.includes('dp') || selectedAlgorithms.includes('all')) {
    if (n <= 16) {
      const resDp = solveDynamicProgramming(costMatrix, 16);
      rawResults.push(evaluator.evaluateResult(resDp));
    } else {
      rawResults.push({
        algorithm: 'Exact Dynamic Programming (Held-Karp)',
        tour: [],
        cost: null,
        execution_time_ms: 0.0,
        error: `Skipped for N=${n} (Intractable for N > 16 due to O(N^2 * 2^N) exponential complexity).`
      });
    }
  }

  // Rank and determine recommended best route
  const [bestAlgo, recommendation, rankedResults] = evaluator.rankAndRecommend(
    rawResults,
    objective
  );

  // Compute Convex Hull and Centroid
  const pointCoords = locations.map((loc) => [
    parseFloat(loc.lat !== undefined ? loc.lat : loc.x || 0),
    parseFloat(loc.lng !== undefined ? loc.lng : loc.y || 0)
  ]);
  const hullPolygon = convexHull(pointCoords);
  const centroid = calculateCentroid(pointCoords);

  // Fetch road geometry for the tours
  const roadGeometries = {};
  for (const r of rankedResults) {
    if (r.tour && r.tour.length > 0 && !r.error) {
      const algoKey = r.algorithm;
      const coords = r.route_coordinates || [];
      if (coordinateType === 'gps' && r.is_recommended) {
        roadGeometries[algoKey] = await fetchRoadGeometry(coords);
      } else {
        roadGeometries[algoKey] = coords;
      }
    }
  }

  const responsePayload = {
    status: 'success',
    num_locations: n,
    objective,
    recommended_algorithm: bestAlgo,
    recommendation,
    algorithms_comparison: rankedResults,
    road_geometries: roadGeometries,
    convex_hull: hullPolygon,
    centroid,
    matrix_summary: {
      locations,
      traffic_multipliers: matrixBuilder.trafficMatrix,
      road_multipliers: matrixBuilder.roadMatrix
    }
  };

  res.json(responsePayload);
});

// API: Benchmark Scalability
app.post('/api/benchmark', (req, res) => {
  const sizes = [6, 10, 15, 25, 40];
  const benchmarkData = [];

  for (const sz of sizes) {
    const pts = [];
    for (let i = 0; i < sz; i++) {
      pts.push({
        lat: 17.7 + (Math.random() - 0.5) * 0.2,
        lng: 83.2 + (Math.random() - 0.5) * 0.2
      });
    }

    const matrixBuilder = new CostMatrixBuilder({ locations: pts });
    const cMat = matrixBuilder.compositeCostMatrix;

    let t0 = performance.now();
    const sa = solveSimulatedAnnealing(cMat);
    const saTime = performance.now() - t0;

    t0 = performance.now();
    const aco = solveAntColony(cMat, { maxIterations: 50 });
    const acoTime = performance.now() - t0;

    t0 = performance.now();
    const ga = solveGeneticAlgorithm(cMat, { generations: 40 });
    const gaTime = performance.now() - t0;

    t0 = performance.now();
    const twoOpt = solveTwoOpt(cMat);
    const twoOptTime = performance.now() - t0;

    benchmarkData.push({
      num_cities: sz,
      sa: { time_ms: Math.round(saTime * 100) / 100, cost: sa.cost },
      aco: { time_ms: Math.round(acoTime * 100) / 100, cost: aco.cost },
      ga: { time_ms: Math.round(gaTime * 100) / 100, cost: ga.cost },
      two_opt: { time_ms: Math.round(twoOptTime * 100) / 100, cost: twoOpt.cost }
    });
  }

  res.json({ benchmark_results: benchmarkData });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Starting OptiRoute Node.js Server on http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
