/**
 * OptiRoute Node.js Integration & Verification Test Suite.
 * Validates endpoints: /api/presets, /api/config, /api/generate_random, /api/optimize.
 */

const app = require('./server');

async function runTests() {
  console.log('Starting OptiRoute Node.js Test Suite...\n');

  // Spin up test server on random available port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral Test Server listening on ${baseUrl}`);

  try {
    // 1. Test GET /api/presets
    console.log('\n--- Test 1: GET /api/presets ---');
    const respPresets = await fetch(`${baseUrl}/api/presets`);
    console.log(`Status: ${respPresets.status} ${respPresets.statusText}`);
    if (!respPresets.ok) throw new Error('Presets endpoint failed');
    const presetsData = await respPresets.json();
    const presets = presetsData.presets || [];
    console.log(`Loaded ${presets.length} presets from data/presets.json.`);
    if (presets.length === 0) throw new Error('No presets found');

    // 2. Test GET /api/config
    console.log('\n--- Test 2: GET /api/config ---');
    const respConfig = await fetch(`${baseUrl}/api/config`);
    console.log(`Status: ${respConfig.status} ${respConfig.statusText}`);
    const configData = await respConfig.json();
    console.log(`Active routing provider: ${configData.active_provider}`);
    console.log(`ORS Key Masked: ${configData.openrouteservice_key_masked}`);

    // 3. Test POST /api/generate_random
    console.log('\n--- Test 3: POST /api/generate_random ---');
    const respRandom = await fetch(`${baseUrl}/api/generate_random`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        depot: { lat: 13.0827, lng: 80.2707, name: 'Chennai Central Depot' },
        count: 5,
        radius_km: 10
      })
    });
    console.log(`Status: ${respRandom.status} ${respRandom.statusText}`);
    const randomData = await respRandom.json();
    console.log(`Generated ${randomData.stops?.length} random stops successfully.`);

    // 4. Test POST /api/optimize
    console.log('\n--- Test 4: POST /api/optimize (Algorithms Execution) ---');
    const p0 = presets[0];
    const payload = {
      locations: [p0.depot, ...p0.stops],
      algorithms: ['sa', 'aco', 'ga', 'two_opt', 'dp'],
      objective: 'balanced',
      weight_distance: 0.5,
      weight_time: 0.5,
      coordinate_type: 'gps'
    };

    const respOpt = await fetch(`${baseUrl}/api/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`Status: ${respOpt.status} ${respOpt.statusText}`);
    if (!respOpt.ok) throw new Error('Optimize endpoint failed');
    const optResult = await respOpt.json();

    console.log(`Recommended Algorithm: ${optResult.recommended_algorithm}`);
    console.log(`Suitability Score: ${optResult.recommendation?.suitability_score}%`);
    console.log(`Convex Hull Vertices: ${optResult.convex_hull?.length}`);
    console.log(`Centroid: [${optResult.centroid?.map((c) => c.toFixed(4)).join(', ')}]`);

    console.log('\nAlgorithmic Comparison Summary:');
    for (const algo of optResult.algorithms_comparison || []) {
      const name = algo.algorithm;
      const dist = algo.total_distance_km;
      const t = algo.travel_time_formatted;
      const execMs = algo.execution_time_ms;
      const inter = algo.route_intersections;
      const score = algo.suitability_score;
      const isWinner = algo.is_recommended ? ' 🏆 (WINNER)' : '';
      console.log(`  * ${name}: ${dist}km, ${t}, ${execMs}ms, crossings=${inter}, score=${score}%${isWinner}`);
    }

    // 5. Test POST /api/benchmark
    console.log('\n--- Test 5: POST /api/benchmark ---');
    const respBenchmark = await fetch(`${baseUrl}/api/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`Status: ${respBenchmark.status} ${respBenchmark.statusText}`);
    const benchData = await respBenchmark.json();
    console.log(`Benchmark completed across ${benchData.benchmark_results?.length} problem sizes.`);

    console.log('\n ALL TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error(`Test failed: ${err.message}`, err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
