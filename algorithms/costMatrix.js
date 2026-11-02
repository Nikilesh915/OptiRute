/**
 * Cost Matrix and Multi-Criteria Travel Cost Formulation for OptiRoute (Node.js).
 * Computes distance, traffic penalty, road condition adjustments, and composite cost matrices.
 */

const { haversineDistance, euclideanDistance } = require('./computationalGeometry');

const TRAFFIC_MULTIPLIERS = {
  low: 1.0,
  medium: 1.3,
  heavy: 1.8,
  severe: 2.3
};

const ROAD_CONDITION_MULTIPLIERS = {
  paved: 1.0,
  urban: 1.2,
  rough: 1.5,
  poor: 1.8
};

const BASE_SPEED_KMH = 40.0; // Base delivery vehicle speed in km/h

class CostMatrixBuilder {
  /**
   * locations: array of objects with:
   *   - id / name
   *   - lat / x
   *   - lng / y
   *   - traffic: 'low' | 'medium' | 'heavy' | 'severe' (optional, defaults to 'medium')
   *   - road_condition: 'paved' | 'urban' | 'rough' | 'poor' (optional, defaults to 'paved')
   */
  constructor({
    locations = [],
    coordinateType = 'gps',
    baseSpeedKmh = BASE_SPEED_KMH,
    weightDistance = 0.5,
    weightTime = 0.5
  } = {}) {
    this.locations = locations;
    this.numNodes = locations.length;
    this.coordinateType = coordinateType;
    this.baseSpeed = baseSpeedKmh;
    this.weightDistance = weightDistance;
    this.weightTime = weightTime;

    this.distanceMatrix = [];
    this.timeMatrix = []; // in minutes
    this.trafficMatrix = []; // traffic factor
    this.roadMatrix = []; // road factor
    this.compositeCostMatrix = [];

    this._buildMatrices();
  }

  _extractCoord(loc) {
    const lat = loc.lat !== undefined ? loc.lat : loc.x !== undefined ? loc.x : 0.0;
    const lng = loc.lng !== undefined ? loc.lng : loc.y !== undefined ? loc.y : 0.0;
    return [parseFloat(lat), parseFloat(lng)];
  }

  _getTrafficFactor(locI, locJ) {
    const tfI = TRAFFIC_MULTIPLIERS[(locI.traffic || 'medium').toLowerCase()] || 1.3;
    const tfJ = TRAFFIC_MULTIPLIERS[(locJ.traffic || 'medium').toLowerCase()] || 1.3;
    return (tfI + tfJ) / 2.0;
  }

  _getRoadFactor(locI, locJ) {
    const rfI = ROAD_CONDITION_MULTIPLIERS[(locI.road_condition || 'paved').toLowerCase()] || 1.0;
    const rfJ = ROAD_CONDITION_MULTIPLIERS[(locJ.road_condition || 'paved').toLowerCase()] || 1.0;
    return (rfI + rfJ) / 2.0;
  }

  _buildMatrices() {
    const n = this.numNodes;
    this.distanceMatrix = Array.from({ length: n }, () => Array(n).fill(0.0));
    this.timeMatrix = Array.from({ length: n }, () => Array(n).fill(0.0));
    this.trafficMatrix = Array.from({ length: n }, () => Array(n).fill(1.0));
    this.roadMatrix = Array.from({ length: n }, () => Array(n).fill(1.0));
    this.compositeCostMatrix = Array.from({ length: n }, () => Array(n).fill(0.0));

    const coords = this.locations.map((loc) => this._extractCoord(loc));

    // Calculate distances
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;

        let dist = 0.0;
        if (this.coordinateType === 'cartesian') {
          dist = euclideanDistance(coords[i], coords[j]);
        } else {
          dist = haversineDistance(coords[i], coords[j]);
        }

        this.distanceMatrix[i][j] = dist;

        const tf = this._getTrafficFactor(this.locations[i], this.locations[j]);
        const rf = this._getRoadFactor(this.locations[i], this.locations[j]);
        this.trafficMatrix[i][j] = tf;
        this.roadMatrix[i][j] = rf;

        // Effective speed = max(5.0, baseSpeed / (tf * rf))
        // Time in minutes = (dist / effective_speed) * 60
        const effectiveSpeed = Math.max(5.0, this.baseSpeed / (tf * rf));
        const travelTimeMin = (dist / effectiveSpeed) * 60.0;
        this.timeMatrix[i][j] = travelTimeMin;
      }
    }

    // Normalize distance and time for composite cost
    let maxDist = 0.0;
    let maxTime = 0.0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (this.distanceMatrix[i][j] > maxDist) maxDist = this.distanceMatrix[i][j];
        if (this.timeMatrix[i][j] > maxTime) maxTime = this.timeMatrix[i][j];
      }
    }
    maxDist = maxDist || 1.0;
    maxTime = maxTime || 1.0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const normDist = this.distanceMatrix[i][j] / maxDist;
        const normTime = this.timeMatrix[i][j] / maxTime;
        const cost = this.weightDistance * normDist + this.weightTime * normTime;
        this.compositeCostMatrix[i][j] = cost;
      }
    }
  }

  getRouteMetrics(tour) {
    if (!tour || tour.length === 0) {
      return { total_distance_km: 0.0, total_time_min: 0.0 };
    }

    const fullTour = [...tour];
    if (fullTour[fullTour.length - 1] !== fullTour[0]) {
      fullTour.push(fullTour[0]);
    }

    let totalDist = 0.0;
    let totalTime = 0.0;
    let totalTf = 0.0;
    let totalRf = 0.0;
    const numLegs = fullTour.length - 1;

    const legs = [];
    for (let idx = 0; idx < numLegs; idx++) {
      const u = fullTour[idx];
      const v = fullTour[idx + 1];
      const dist = this.distanceMatrix[u][v];
      const t = this.timeMatrix[u][v];
      const tf = this.trafficMatrix[u][v];
      const rf = this.roadMatrix[u][v];

      totalDist += dist;
      totalTime += t;
      totalTf += tf;
      totalRf += rf;

      legs.push({
        from_index: u,
        to_index: v,
        from_name: this.locations[u]?.name || `Stop ${u}`,
        to_name: this.locations[v]?.name || `Stop ${v}`,
        distance_km: Math.round(dist * 100) / 100,
        travel_time_min: Math.round(t * 10) / 10,
        traffic_factor: Math.round(tf * 100) / 100,
        road_factor: Math.round(rf * 100) / 100
      });
    }

    const avgTf = numLegs > 0 ? totalTf / numLegs : 1.0;
    const avgRf = numLegs > 0 ? totalRf / numLegs : 1.0;

    return {
      total_distance_km: Math.round(totalDist * 100) / 100,
      total_time_min: Math.round(totalTime * 10) / 10,
      average_traffic_factor: Math.round(avgTf * 100) / 100,
      average_road_factor: Math.round(avgRf * 100) / 100,
      num_stops: tour[tour.length - 1] === tour[0] ? tour.length - 1 : tour.length - 1,
      legs
    };
  }
}

module.exports = {
  CostMatrixBuilder,
  TRAFFIC_MULTIPLIERS,
  ROAD_CONDITION_MULTIPLIERS,
  BASE_SPEED_KMH
};
