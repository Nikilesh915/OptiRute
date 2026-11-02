/**
 * Computational Geometry Module for OptiRoute (Node.js).
 * Provides geometric utilities for 2D Cartesian and spherical (GPS) coordinates:
 * - Haversine geodesic distance calculation
 * - Euclidean distance calculation
 * - Convex Hull (Monotone Chain / Andrew's algorithm)
 * - Geometric 2-Opt edge crossing detection and untangling
 * - Route centroid and bounding box computation
 */

const EARTH_RADIUS_KM = 6371.0; // Earth mean radius in kilometers

/**
 * Calculate great-circle distance between two GPS coordinates [lat, lng] in kilometers
 * using Haversine formula.
 */
function haversineDistance(coord1, coord2) {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const toRad = (deg) => (deg * Math.PI) / 180.0;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) ** 2;

  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1.0 - a)));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate Euclidean distance in 2D Cartesian coordinates.
 */
function euclideanDistance(p1, p2) {
  return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
}

/**
 * 2D cross product of OA and OB vectors: (Ax - Ox) * (By - Oy) - (Ay - Oy) * (Bx - Ox).
 * Returns positive if O-A-B makes counter-clockwise turn, negative for clockwise, 0 if collinear.
 */
function crossProduct(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/**
 * Compute Convex Hull using Monotone Chain algorithm (Andrew's algorithm).
 * Time Complexity: O(n log n).
 * Returns vertices of convex hull in counter-clockwise order.
 */
function convexHull(points) {
  if (!points || points.length === 0) return [];

  // Deduplicate points
  const pointMap = new Map();
  for (const p of points) {
    const key = `${p[0]},${p[1]}`;
    if (!pointMap.has(key)) {
      pointMap.set(key, [p[0], p[1]]);
    }
  }
  const uniquePoints = Array.from(pointMap.values());

  // Sort lexicographically by first coordinate (lat/x), then second (lng/y)
  uniquePoints.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];
  });

  if (uniquePoints.length <= 2) {
    return uniquePoints;
  }

  // Build lower hull
  const lower = [];
  for (const p of uniquePoints) {
    while (
      lower.length >= 2 &&
      crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  // Build upper hull
  const upper = [];
  for (let i = uniquePoints.length - 1; i >= 0; i--) {
    const p = uniquePoints[i];
    while (
      upper.length >= 2 &&
      crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  // Concatenate lower and upper hull (omit the last point of each because it's repeated)
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/**
 * Determines if line segment (p1, p2) intersects with line segment (p3, p4).
 * Uses computational geometry orientation tests.
 */
function segmentsIntersect(p1, p2, p3, p4) {
  const d1 = crossProduct(p3, p4, p1);
  const d2 = crossProduct(p3, p4, p2);
  const d3 = crossProduct(p1, p2, p3);
  const d4 = crossProduct(p1, p2, p4);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  return false;
}

/**
 * Count the number of self-intersecting segments in a TSP closed tour.
 * In Euclidean geometry, optimal TSP tours never intersect.
 */
function countRouteIntersections(routeCoords) {
  if (!routeCoords) return 0;
  const n = routeCoords.length;
  if (n < 4) return 0;

  let intersections = 0;
  // Closed loop: includes edge from last point to first
  const edges = [];
  for (let i = 0; i < n; i++) {
    edges.push([routeCoords[i], routeCoords[(i + 1) % n]]);
  }

  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 2; j < edges.length; j++) {
      // Skip adjacent edges that share an endpoint
      if (i === 0 && j === edges.length - 1) {
        continue;
      }
      const [p1, p2] = edges[i];
      const [p3, p4] = edges[j];
      if (segmentsIntersect(p1, p2, p3, p4)) {
        intersections += 1;
      }
    }
  }

  return intersections;
}

/**
 * Calculate geometric center (centroid) of a set of coordinates.
 */
function calculateCentroid(coords) {
  if (!coords || coords.length === 0) return [0.0, 0.0];
  const sumLat = coords.reduce((acc, c) => acc + c[0], 0);
  const sumLng = coords.reduce((acc, c) => acc + c[1], 0);
  return [sumLat / coords.length, sumLng / coords.length];
}

module.exports = {
  EARTH_RADIUS_KM,
  haversineDistance,
  euclideanDistance,
  crossProduct,
  convexHull,
  segmentsIntersect,
  countRouteIntersections,
  calculateCentroid
};
