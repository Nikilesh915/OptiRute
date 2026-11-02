/**
 * Simulated Annealing (SA) Algorithm for TSP (Node.js).
 * Implemented in accordance with parameters from research paper:
 * Nemani et al. (2021) "Algorithms and Optimization Techniques for Solving TSP"
 * - T_max = 100 (Initial Temperature)
 * - T_min = 1 (Final Temperature)
 * - L = 10 * N (Chain Length / Iterations per temperature level)
 * - Geometric cooling: T = T * alpha (e.g. alpha = 0.96)
 * - Metropolis acceptance criterion: P = exp(-delta_E / T)
 * - High-performance O(1) delta neighborhood evaluation without memory allocation
 */

const { performance } = require('perf_hooks');
const { calculateTourCost } = require('./twoOpt');

function solveSimulatedAnnealing(
  costMatrix,
  {
    initialTemperature = 100.0,
    minTemperature = 1.0,
    coolingRate = 0.96,
    chainLengthMultiplier = 10
  } = {}
) {
  const startTime = performance.now();
  const n = costMatrix.length;

  if (n <= 2) {
    const tour = Array.from({ length: n }, (_, i) => i);
    const execTime = performance.now() - startTime;
    const c = calculateTourCost(tour, costMatrix);
    return {
      algorithm: 'Simulated Annealing (SA)',
      tour: [...tour, tour[0]],
      cost: Math.round(c * 1000) / 1000,
      execution_time_ms: Math.round(execTime * 10000) / 10000,
      iterations: 0,
      cooling_steps: 0,
      total_trials: 0,
      convergence_history: [c]
    };
  }

  // Initial tour (depot 0 fixed at start)
  const customerNodes = [];
  for (let i = 1; i < n; i++) customerNodes.push(i);

  // Fisher-Yates shuffle
  for (let i = customerNodes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [customerNodes[i], customerNodes[j]] = [customerNodes[j], customerNodes[i]];
  }

  let currentTour = [0, ...customerNodes];
  let currentCost = calculateTourCost(currentTour, costMatrix);
  let bestTour = [...currentTour];
  let bestCost = currentCost;

  let temperature = initialTemperature;
  const iterationsPerTemp = Math.max(10, chainLengthMultiplier * n);

  const convergenceHistory = [Math.round(bestCost * 100) / 100];
  let totalTrials = 0;
  let coolingSteps = 0;

  while (temperature > minTemperature) {
    coolingSteps += 1;

    for (let it = 0; it < iterationsPerTemp; it++) {
      totalTrials += 1;

      if (n > 3) {
        // Pick random customer segment [i, j] where 1 <= i < j <= n - 1
        const i = 1 + Math.floor(Math.random() * (n - 2));
        const j = i + 1 + Math.floor(Math.random() * (n - 1 - i));

        // High-performance O(1) 2-opt delta evaluation
        // Edges removed: (i-1, i) and (j, (j+1)%n)
        // Edges added:   (i-1, j) and (i, (j+1)%n)
        const a = currentTour[i - 1];
        const b = currentTour[i];
        const c = currentTour[j];
        const d = currentTour[(j + 1) % n];

        const delta =
          costMatrix[a][c] + costMatrix[b][d] - (costMatrix[a][b] + costMatrix[c][d]);

        // Metropolis acceptance test
        if (delta < 0 || Math.random() < Math.exp(-delta / Math.max(temperature, 1e-9))) {
          // In-place segment reversal (zero memory allocation)
          let left = i;
          let right = j;
          while (left < right) {
            const tmp = currentTour[left];
            currentTour[left] = currentTour[right];
            currentTour[right] = tmp;
            left++;
            right--;
          }

          currentCost += delta;

          if (currentCost < bestCost) {
            bestTour = [...currentTour];
            bestCost = currentCost;
          }
        }
      }
    }

    convergenceHistory.push(Math.round(bestCost * 100) / 100);
    temperature *= coolingRate;
  }

  // Fast 2-Opt boundary polish to untangle any lingering crossings
  let polishImproved = true;
  let polishRounds = 0;
  while (polishImproved && polishRounds < 20) {
    polishImproved = false;
    polishRounds++;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = bestTour[i - 1];
        const b = bestTour[i];
        const c = bestTour[k];
        const d = bestTour[(k + 1) % n];
        const delta =
          costMatrix[a][c] + costMatrix[b][d] - (costMatrix[a][b] + costMatrix[c][d]);
        if (delta < -1e-6) {
          let left = i;
          let right = k;
          while (left < right) {
            const tmp = bestTour[left];
            bestTour[left] = bestTour[right];
            bestTour[right] = tmp;
            left++;
            right--;
          }
          bestCost += delta;
          polishImproved = true;
          break;
        }
      }
      if (polishImproved) break;
    }
  }

  const execTime = performance.now() - startTime;

  if (bestTour[0] !== 0) {
    const idxZero = bestTour.indexOf(0);
    bestTour = bestTour.slice(idxZero).concat(bestTour.slice(0, idxZero));
  }

  const finalTour = [...bestTour, bestTour[0]];

  return {
    algorithm: 'Simulated Annealing (SA)',
    tour: finalTour,
    cost: Math.round(bestCost * 1000) / 1000,
    execution_time_ms: Math.round(execTime * 10000) / 10000,
    iterations: coolingSteps, // Macro cooling steps matching GA generations / ACO cycles
    cooling_steps: coolingSteps,
    total_trials: totalTrials,
    convergence_history: convergenceHistory
  };
}

module.exports = {
  solveSimulatedAnnealing
};