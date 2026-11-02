/**
 * Ant Colony Optimization (ACO) Algorithm for TSP (Node.js).
 * Implemented in accordance with parameters from research paper:
 * Nemani et al. (2021) "Algorithms and Optimization Techniques for Solving TSP"
 * - Population of Ants = 40
 * - Alpha = 1.0 (pheromone parameter)
 * - Beta = 2.0 (heuristic visibility parameter)
 * - Rho = 0.1 (evaporation rate)
 * - Pheromone reinforcement along best tours
 */

const { performance } = require('perf_hooks');
const { calculateTourCost } = require('./twoOpt');

function solveAntColony(
  costMatrix,
  {
    numAnts = 40,
    maxIterations = 100,
    alpha = 1.0,
    beta = 2.0,
    rho = 0.1,
    qConstant = 100.0
  } = {}
) {
  const startTime = performance.now();
  const n = costMatrix.length;

  if (n <= 2) {
    const tour = Array.from({ length: n }, (_, i) => i);
    const execTime = performance.now() - startTime;
    const c = calculateTourCost(tour, costMatrix);
    return {
      algorithm: 'Ant Colony Optimization',
      tour: [...tour, tour[0]],
      cost: Math.round(c * 1000) / 1000,
      execution_time_ms: Math.round(execTime * 10000) / 10000,
      iterations: 0,
      convergence_history: [c]
    };
  }

  const effectiveAnts = Math.min(numAnts, Math.max(10, n * 2));

  // Precalculate heuristic visibility: eta[i][j] = 1 / cost[i][j]
  const eta = Array.from({ length: n }, () => Array(n).fill(0.0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && costMatrix[i][j] > 1e-6) {
        eta[i][j] = 1.0 / costMatrix[i][j];
      } else if (i !== j) {
        eta[i][j] = 1.0 / 0.001;
      }
    }
  }

  // Initialize pheromone matrix
  const pheromone = Array.from({ length: n }, () => Array(n).fill(1.0));

  let bestTour = [];
  let bestCost = Infinity;
  const convergenceHistory = [];

  for (let it = 0; it < maxIterations; it++) {
    const allTours = [];
    const allCosts = [];

    for (let ant = 0; ant < effectiveAnts; ant++) {
      // Each ant starts at depot (node 0)
      let currentCity = 0;
      const tour = [currentCity];
      const unvisited = new Set();
      for (let i = 1; i < n; i++) unvisited.add(i);

      while (unvisited.size > 0) {
        const nodesList = Array.from(unvisited);
        const probabilities = [];
        let totalWeight = 0.0;

        for (const nextCity of nodesList) {
          const tauVal = Math.pow(pheromone[currentCity][nextCity], alpha);
          const etaVal = Math.pow(eta[currentCity][nextCity], beta);
          const weight = tauVal * etaVal;
          probabilities.push(weight);
          totalWeight += weight;
        }

        let nextCity = nodesList[nodesList.length - 1];
        if (totalWeight <= 1e-12) {
          // Uniform random choice
          nextCity = nodesList[Math.floor(Math.random() * nodesList.length)];
        } else {
          const r = Math.random() * totalWeight;
          let cumulative = 0.0;
          for (let idx = 0; idx < probabilities.length; idx++) {
            cumulative += probabilities[idx];
            if (cumulative >= r) {
              nextCity = nodesList[idx];
              break;
            }
          }
        }

        tour.push(nextCity);
        unvisited.delete(nextCity);
        currentCity = nextCity;
      }

      const tourCost = calculateTourCost(tour, costMatrix);
      allTours.push(tour);
      allCosts.push(tourCost);

      if (tourCost < bestCost) {
        bestCost = tourCost;
        bestTour = [...tour];
      }
    }

    // Evaporate pheromone
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        pheromone[i][j] *= 1.0 - rho;
      }
    }

    // Pheromone deposit by all ants
    for (let antIdx = 0; antIdx < allTours.length; antIdx++) {
      const tour = allTours[antIdx];
      const cost = allCosts[antIdx];
      const deltaTau = qConstant / Math.max(cost, 1e-6);
      for (let k = 0; k < n; k++) {
        const u = tour[k];
        const v = tour[(k + 1) % n];
        pheromone[u][v] += deltaTau;
        pheromone[v][u] += deltaTau;
      }
    }

    // Elitist deposit on global best
    if (bestTour.length > 0) {
      const bestDelta = (qConstant * 2.0) / Math.max(bestCost, 1e-6);
      for (let k = 0; k < n; k++) {
        const u = bestTour[k];
        const v = bestTour[(k + 1) % n];
        pheromone[u][v] += bestDelta;
        pheromone[v][u] += bestDelta;
      }
    }

    convergenceHistory.push(Math.round(bestCost * 100) / 100);
  }

  const execTime = performance.now() - startTime;

  if (bestTour.length > 0 && bestTour[0] !== 0) {
    const idxZero = bestTour.indexOf(0);
    bestTour = bestTour.slice(idxZero).concat(bestTour.slice(0, idxZero));
  }

  const finalTour = bestTour.length > 0 ? [...bestTour, bestTour[0]] : [];

  return {
    algorithm: 'Ant Colony Optimization (ACO)',
    tour: finalTour,
    cost: Math.round(bestCost * 1000) / 1000,
    execution_time_ms: Math.round(execTime * 10000) / 10000,
    iterations: maxIterations,
    convergence_history: convergenceHistory
  };
}

module.exports = {
  solveAntColony
};