/**
 * Dynamic Programming (Held-Karp) Exact TSP Algorithm (Node.js).
 * Provides the mathematical ground truth optimal solution for small N (N <= 16).
 * Complexity: O(n^2 * 2^n).
 * Used as an exact benchmark to calculate the absolute optimality gap of approximation algorithms.
 */

const { performance } = require('perf_hooks');
const { calculateTourCost } = require('./twoOpt');

function solveDynamicProgramming(costMatrix, maxNodesLimit = 16) {
  const startTime = performance.now();
  const n = costMatrix.length;

  if (n > maxNodesLimit) {
    return {
      algorithm: 'Exact Dynamic Programming (Held-Karp)',
      tour: [],
      cost: null,
      execution_time_ms: 0.0,
      is_exact: true,
      error: `Intractable for N=${n} (N > ${maxNodesLimit}). Held-Karp complexity is O(N^2 * 2^N). Please use approximation algorithms (SA, ACO, GA, 2-Opt) for large instances.`
    };
  }

  if (n <= 2) {
    const tour = Array.from({ length: n }, (_, i) => i);
    const execTime = performance.now() - startTime;
    const c = calculateTourCost(tour, costMatrix);
    return {
      algorithm: 'Exact Dynamic Programming (Held-Karp)',
      tour: [...tour, tour[0]],
      cost: Math.round(c * 1000) / 1000,
      execution_time_ms: Math.round(execTime * 10000) / 10000,
      is_exact: true,
      iterations: 1,
      convergence_history: [c]
    };
  }

  // memo[stateKey] = { minCost, bestNext }
  // stateKey = `${mask}_${u}`
  const memo = new Map();

  function getMinCost(mask, u) {
    // Base case: all nodes visited, must return to depot (0)
    if (mask === (1 << n) - 1) {
      return { minCost: costMatrix[u][0], bestNext: 0 };
    }

    const key = (mask << 5) | u; // Bit packing key since n <= 16, mask < 65536
    if (memo.has(key)) {
      return memo.get(key);
    }

    let minRes = Infinity;
    let bestNext = -1;

    for (let v = 0; v < n; v++) {
      if (!(mask & (1 << v))) {
        const sub = getMinCost(mask | (1 << v), v);
        const total = costMatrix[u][v] + sub.minCost;
        if (total < minRes) {
          minRes = total;
          bestNext = v;
        }
      }
    }

    const res = { minCost: minRes, bestNext };
    memo.set(key, res);
    return res;
  }

  // Start at depot 0 with mask having bit 0 set (1)
  const { minCost } = getMinCost(1, 0);

  // Reconstruct tour
  const tour = [0];
  let currMask = 1;
  let currNode = 0;

  for (let step = 0; step < n - 1; step++) {
    const key = (currMask << 5) | currNode;
    const { bestNext } = memo.get(key);
    tour.push(bestNext);
    currMask |= 1 << bestNext;
    currNode = bestNext;
  }

  const finalTour = [...tour, 0];
  const execTime = performance.now() - startTime;

  return {
    algorithm: 'Exact Dynamic Programming (Held-Karp)',
    tour: finalTour,
    cost: Math.round(minCost * 1000) / 1000,
    execution_time_ms: Math.round(execTime * 10000) / 10000,
    is_exact: true,
    iterations: Math.pow(2, n),
    convergence_history: [Math.round(minCost * 100) / 100]
  };
}

module.exports = {
  solveDynamicProgramming
};
