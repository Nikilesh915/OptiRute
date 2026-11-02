/**
 * 2-Opt Local Search and Edge-Untangling Approximation Algorithm for TSP (Node.js).
 * Computational Geometry Optimization: Eliminates crossing edges and achieves 2-optimal route.
 */

const { performance } = require('perf_hooks');

/**
 * Construct an initial tour using Greedy Nearest Neighbor heuristic.
 */
function nearestNeighborTour(costMatrix, startNode = 0) {
  const n = costMatrix.length;
  const unvisited = new Set();
  for (let i = 0; i < n; i++) {
    if (i !== startNode) unvisited.add(i);
  }

  const tour = [startNode];
  let current = startNode;

  while (unvisited.size > 0) {
    let nextNode = -1;
    let minCost = Infinity;

    for (const node of unvisited) {
      const c = costMatrix[current][node];
      if (c < minCost) {
        minCost = c;
        nextNode = node;
      }
    }

    tour.push(nextNode);
    unvisited.delete(nextNode);
    current = nextNode;
  }

  return tour;
}

/**
 * Compute total cost of a tour (including return to start).
 */
function calculateTourCost(tour, costMatrix) {
  let cost = 0.0;
  const n = tour.length;
  for (let i = 0; i < n; i++) {
    const u = tour[i];
    const v = tour[(i + 1) % n];
    cost += costMatrix[u][v];
  }
  return cost;
}

/**
 * Perform a 2-opt swap: reverse the tour segment between index i and k.
 */
function twoOptSwap(tour, i, k) {
  // 1. Take tour[0] to tour[i-1]
  // 2. Reverse tour[i] to tour[k]
  // 3. Take tour[k+1] to end
  const part1 = tour.slice(0, i);
  const part2 = tour.slice(i, k + 1).reverse();
  const part3 = tour.slice(k + 1);
  return part1.concat(part2, part3);
}

/**
 * Optimize tour using 2-Opt local search approximation.
 */
function solveTwoOpt(costMatrix, initialTour = null, maxIterations = 1000) {
  const startTime = performance.now();
  const n = costMatrix.length;

  if (n <= 2) {
    const tour = Array.from({ length: n }, (_, i) => i);
    const execTime = performance.now() - startTime;
    const c = calculateTourCost(tour, costMatrix);
    return {
      algorithm: '2-Opt Local Search',
      tour: [...tour, tour[0]],
      cost: Math.round(c * 1000) / 1000,
      execution_time_ms: Math.round(execTime * 10000) / 10000,
      iterations: 0,
      convergence_history: [c]
    };
  }

  let currentTour;
  if (!initialTour) {
    currentTour = nearestNeighborTour(costMatrix, 0);
  } else {
    currentTour =
      initialTour[initialTour.length - 1] === initialTour[0]
        ? initialTour.slice(0, -1)
        : [...initialTour];
  }

  let bestCost = calculateTourCost(currentTour, costMatrix);
  const convergenceHistory = [Math.round(bestCost * 100) / 100];

  let improved = true;
  let iteration = 0;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration += 1;

    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = currentTour[i - 1];
        const b = currentTour[i];
        const c = currentTour[k];
        const d = currentTour[(k + 1) % n];

        const delta =
          costMatrix[a][c] + costMatrix[b][d] - (costMatrix[a][b] + costMatrix[c][d]);

        if (delta < -1e-6) {
          currentTour = twoOptSwap(currentTour, i, k);
          bestCost += delta;
          improved = true;
          convergenceHistory.push(Math.round(bestCost * 100) / 100);
          break;
        }
      }
      if (improved) break;
    }
  }

  const execTime = performance.now() - startTime;

  // Ensure tour starts at 0 (warehouse)
  if (currentTour[0] !== 0) {
    const idxZero = currentTour.indexOf(0);
    currentTour = currentTour.slice(idxZero).concat(currentTour.slice(0, idxZero));
  }

  const finalTour = [...currentTour, currentTour[0]];

  return {
    algorithm: '2-Opt Local Search',
    tour: finalTour,
    cost: Math.round(bestCost * 1000) / 1000,
    execution_time_ms: Math.round(execTime * 10000) / 10000,
    iterations: iteration,
    convergence_history: convergenceHistory
  };
}

module.exports = {
  nearestNeighborTour,
  calculateTourCost,
  twoOptSwap,
  solveTwoOpt
};
