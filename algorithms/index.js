/**
 * OptiRoute Algorithms Package (Node.js).
 * Exposes computational geometry utilities, cost matrix models, and TSP solvers.
 */

const {
  EARTH_RADIUS_KM,
  haversineDistance,
  euclideanDistance,
  crossProduct,
  convexHull,
  segmentsIntersect,
  countRouteIntersections,
  calculateCentroid
} = require('./computationalGeometry');

const {
  CostMatrixBuilder,
  TRAFFIC_MULTIPLIERS,
  ROAD_CONDITION_MULTIPLIERS,
  BASE_SPEED_KMH
} = require('./costMatrix');

const {
  nearestNeighborTour,
  calculateTourCost,
  twoOptSwap,
  solveTwoOpt
} = require('./twoOpt');

const { solveSimulatedAnnealing } = require('./simulatedAnnealing');
const { solveAntColony } = require('./antColony');
const {
  orderedCrossover,
  mutate,
  tournamentSelection,
  solveGeneticAlgorithm
} = require('./geneticAlgorithm');
const { solveDynamicProgramming } = require('./dynamicProgramming');
const { RouteEvaluator } = require('./routeEvaluator');

module.exports = {
  EARTH_RADIUS_KM,
  haversineDistance,
  euclideanDistance,
  crossProduct,
  convexHull,
  segmentsIntersect,
  countRouteIntersections,
  calculateCentroid,
  CostMatrixBuilder,
  TRAFFIC_MULTIPLIERS,
  ROAD_CONDITION_MULTIPLIERS,
  BASE_SPEED_KMH,
  nearestNeighborTour,
  calculateTourCost,
  twoOptSwap,
  solveTwoOpt,
  solveSimulatedAnnealing,
  solveAntColony,
  orderedCrossover,
  mutate,
  tournamentSelection,
  solveGeneticAlgorithm,
  solveDynamicProgramming,
  RouteEvaluator
};
