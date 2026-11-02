/**
 * Route Evaluator and Multi-Criteria Recommendation Engine for OptiRoute (Node.js).
 * Computes multi-dimensional performance metrics, intersection counts, fuel/CO2,
 * and determines the recommended best route based on user-defined operational objectives.
 */

const { countRouteIntersections } = require('./computationalGeometry');

class RouteEvaluator {
  constructor(matrixBuilder) {
    this.matrixBuilder = matrixBuilder;
    this.locations = matrixBuilder.locations;
  }

  evaluateResult(rawResult) {
    const tour = rawResult.tour;
    if (!tour || tour.length < 2) {
      return rawResult;
    }

    const metrics = this.matrixBuilder.getRouteMetrics(tour);

    // Extract coordinates for geometric analysis
    const coords = [];
    for (const idx of tour) {
      const loc = this.locations[idx];
      const lat = loc.lat !== undefined ? loc.lat : loc.x !== undefined ? loc.x : 0.0;
      const lng = loc.lng !== undefined ? loc.lng : loc.y !== undefined ? loc.y : 0.0;
      coords.push([parseFloat(lat), parseFloat(lng)]);
    }

    const intersections = countRouteIntersections(coords);

    // Environmental estimation:
    // Delivery van: ~8.5 L / 100 km -> 0.085 L / km
    const avgTf = metrics.average_traffic_factor || 1.0;
    const fuelLiters = Math.round(metrics.total_distance_km * 0.085 * avgTf * 100) / 100;
    // 1 liter fuel approx 2.392 kg CO2
    const co2Kg = Math.round(fuelLiters * 2.392 * 100) / 100;

    const hours = Math.floor(metrics.total_time_min / 60);
    const mins = Math.round(metrics.total_time_min % 60);
    const timeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

    return {
      ...rawResult,
      total_distance_km: metrics.total_distance_km,
      total_time_min: metrics.total_time_min,
      travel_time_formatted: timeFormatted,
      average_traffic_factor: metrics.average_traffic_factor,
      average_road_factor: metrics.average_road_factor,
      route_intersections: intersections,
      estimated_fuel_liters: fuelLiters,
      estimated_co2_kg: co2Kg,
      legs: metrics.legs || [],
      route_coordinates: coords
    };
  }

  rankAndRecommend(results, objective = 'balanced') {
    const validResults = results.filter((r) => r.tour && r.tour.length > 0 && !r.error);
    if (validResults.length === 0) {
      return ['', {}, results];
    }

    const minDist = Math.min(...validResults.map((r) => r.total_distance_km));
    const maxDist = Math.max(...validResults.map((r) => r.total_distance_km)) || 1.0;

    const minTime = Math.min(...validResults.map((r) => r.total_time_min));
    const maxTime = Math.max(...validResults.map((r) => r.total_time_min)) || 1.0;

    const minExec = Math.min(...validResults.map((r) => r.execution_time_ms));
    const maxExec = Math.max(...validResults.map((r) => r.execution_time_ms)) || 1.0;

    const weightMap = {
      balanced: [0.4, 0.4, 0.1, 0.1],
      shortest_distance: [0.75, 0.15, 0.05, 0.05],
      fastest_delivery: [0.15, 0.75, 0.05, 0.05],
      real_time_speed: [0.15, 0.15, 0.65, 0.05]
    };

    const weights = weightMap[objective] || weightMap.balanced;
    const [wDist, wTime, wExec, wInter] = weights;

    for (const r of validResults) {
      const normDist = maxDist > minDist ? (r.total_distance_km - minDist) / (maxDist - minDist) : 0.0;
      const normTime = maxTime > minTime ? (r.total_time_min - minTime) / (maxTime - minTime) : 0.0;
      const normExec = maxExec > minExec ? (r.execution_time_ms - minExec) / (maxExec - minExec) : 0.0;
      const interPenalty = Math.min(1.0, (r.route_intersections || 0) / 5.0);

      const compositePenalty =
        wDist * normDist + wTime * normTime + wExec * normExec + wInter * interPenalty;

      const suitabilityScore = Math.round(Math.max(0.0, (1.0 - compositePenalty) * 100) * 10) / 10;
      r.suitability_score = suitabilityScore;
    }

    const rankedResults = [...validResults].sort(
      (a, b) => b.suitability_score - a.suitability_score
    );
    const best = rankedResults[0];

    const formattedObj = objective.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const reason =
      `Selected as the optimal route for the '${formattedObj}' objective. ` +
      `Achieves a total route distance of ${best.total_distance_km} km in ${best.travel_time_formatted} ` +
      `with an algorithm computation latency of ${best.execution_time_ms} ms ` +
      `and ${best.route_intersections} route crossing(s).`;

    const recommendation = {
      algorithm: best.algorithm,
      suitability_score: best.suitability_score,
      reason,
      summary: {
        distance_km: best.total_distance_km,
        travel_time_min: best.total_time_min,
        execution_time_ms: best.execution_time_ms,
        fuel_liters: best.estimated_fuel_liters,
        co2_kg: best.estimated_co2_kg
      }
    };

    for (const r of results) {
      r.is_recommended = r.algorithm === best.algorithm;
    }

    return [best.algorithm, recommendation, results];
  }
}

module.exports = {
  RouteEvaluator
};
