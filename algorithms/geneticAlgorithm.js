/**
 * Genetic Algorithm (GA) for TSP (Node.js).
 * Implemented in accordance with parameters from research paper:
 * Nemani et al. (2021) "Algorithms and Optimization Techniques for Solving TSP"
 * - Chromosome: Permutation of delivery stops [1..N-1] with depot 0 fixed at endpoints
 * - Tournament Selection
 * - Order Crossover (OX1) preserving valid TSP tour representation without duplicates
 * - Swap and Inversion Mutation
 * - Elitism preservation
 */

const { performance } = require('perf_hooks');
const { calculateTourCost } = require('./twoOpt');

/**
 * Ordered Crossover (OX1): preserves relative ordering from parents
 * without duplicating or omitting cities.
 */
function orderedCrossover(parent1, parent2) {
  const size = parent1.length;
  if (size <= 2) return [...parent1];

  let p1 = Math.floor(Math.random() * size);
  let p2 = Math.floor(Math.random() * size);
  if (p1 > p2) [p1, p2] = [p2, p1];

  const child = Array(size).fill(null);

  // Copy segment from parent1
  for (let i = p1; i <= p2; i++) {
    child[i] = parent1[i];
  }

  // Fill remaining from parent2 in cyclic order starting from p2 + 1
  let p2Idx = (p2 + 1) % size;
  let cIdx = (p2 + 1) % size;

  while (child.includes(null)) {
    const candidate = parent2[p2Idx];
    if (!child.includes(candidate)) {
      child[cIdx] = candidate;
      cIdx = (cIdx + 1) % size;
    }
    p2Idx = (p2Idx + 1) % size;
  }

  return child;
}

/**
 * Performs swap or inversion mutation based on mutation probability.
 */
function mutate(chromosome, mutationRate = 0.05) {
  const mutated = [...chromosome];
  if (Math.random() < mutationRate && mutated.length > 2) {
    if (Math.random() < 0.5) {
      // Pairwise swap
      const i = Math.floor(Math.random() * mutated.length);
      let j = Math.floor(Math.random() * mutated.length);
      while (j === i) {
        j = Math.floor(Math.random() * mutated.length);
      }
      [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
    } else {
      // Subsequence inversion
      let i = Math.floor(Math.random() * mutated.length);
      let j = Math.floor(Math.random() * mutated.length);
      if (i > j) [i, j] = [j, i];
      const reversed = mutated.slice(i, j + 1).reverse();
      for (let k = 0; k < reversed.length; k++) {
        mutated[i + k] = reversed[k];
      }
    }
  }
  return mutated;
}

/**
 * Selects the fittest candidate among randomly drawn tournament contenders.
 */
function tournamentSelection(population, costs, tournamentSize = 5) {
  const popSize = population.length;
  let bestIdx = Math.floor(Math.random() * popSize);
  let bestCost = costs[bestIdx];

  const k = Math.min(tournamentSize, popSize);
  for (let i = 1; i < k; i++) {
    const idx = Math.floor(Math.random() * popSize);
    if (costs[idx] < bestCost) {
      bestCost = costs[idx];
      bestIdx = idx;
    }
  }

  return population[bestIdx];
}

function solveGeneticAlgorithm(
  costMatrix,
  {
    populationSize = 100,
    generations = 80,
    tournamentSize = 5,
    crossoverRate = 0.85,
    mutationRate = 0.05,
    elitismCount = 2
  } = {}
) {
  const startTime = performance.now();
  const n = costMatrix.length;

  if (n <= 2) {
    const tour = Array.from({ length: n }, (_, i) => i);
    const execTime = performance.now() - startTime;
    const c = calculateTourCost(tour, costMatrix);
    return {
      algorithm: 'Genetic Algorithm',
      tour: [...tour, tour[0]],
      cost: Math.round(c * 1000) / 1000,
      execution_time_ms: Math.round(execTime * 10000) / 10000,
      iterations: 0,
      convergence_history: [c]
    };
  }

  // Customer nodes to permute (depot 0 stays at start/end)
  const customerNodes = [];
  for (let i = 1; i < n; i++) customerNodes.push(i);

  // Initialize population of random permutations
  let population = [];
  for (let p = 0; p < populationSize; p++) {
    const perm = [...customerNodes];
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    population.push(perm);
  }

  const evaluateChromosome = (chrom) => {
    const fullTour = [0, ...chrom];
    return calculateTourCost(fullTour, costMatrix);
  };

  let costs = population.map(evaluateChromosome);
  let bestIdx = 0;
  for (let i = 1; i < costs.length; i++) {
    if (costs[i] < costs[bestIdx]) bestIdx = i;
  }
  let bestChrom = [...population[bestIdx]];
  let bestCost = costs[bestIdx];

  const convergenceHistory = [Math.round(bestCost * 100) / 100];

  for (let gen = 0; gen < generations; gen++) {
    // Elitism: preserve top performers
    const sortedIndices = Array.from({ length: population.length }, (_, idx) => idx).sort(
      (a, b) => costs[a] - costs[b]
    );

    const newPopulation = sortedIndices
      .slice(0, elitismCount)
      .map((idx) => [...population[idx]]);

    // Generate offspring
    while (newPopulation.length < populationSize) {
      const parent1 = tournamentSelection(population, costs, tournamentSize);
      const parent2 = tournamentSelection(population, costs, tournamentSize);

      let offspring1;
      let offspring2;

      if (Math.random() < crossoverRate && customerNodes.length >= 2) {
        offspring1 = orderedCrossover(parent1, parent2);
        offspring2 = orderedCrossover(parent2, parent1);
      } else {
        offspring1 = [...parent1];
        offspring2 = [...parent2];
      }

      offspring1 = mutate(offspring1, mutationRate);
      offspring2 = mutate(offspring2, mutationRate);

      newPopulation.push(offspring1);
      if (newPopulation.length < populationSize) {
        newPopulation.push(offspring2);
      }
    }

    population = newPopulation;
    costs = population.map(evaluateChromosome);

    let genBestIdx = 0;
    for (let i = 1; i < costs.length; i++) {
      if (costs[i] < costs[genBestIdx]) genBestIdx = i;
    }

    if (costs[genBestIdx] < bestCost) {
      bestCost = costs[genBestIdx];
      bestChrom = [...population[genBestIdx]];
    }

    convergenceHistory.push(Math.round(bestCost * 100) / 100);
  }

  const execTime = performance.now() - startTime;
  const finalTour = [0, ...bestChrom, 0];

  return {
    algorithm: 'Genetic Algorithm (GA)',
    tour: finalTour,
    cost: Math.round(bestCost * 1000) / 1000,
    execution_time_ms: Math.round(execTime * 10000) / 10000,
    iterations: generations,
    convergence_history: convergenceHistory
  };
}

module.exports = {
  orderedCrossover,
  mutate,
  tournamentSelection,
  solveGeneticAlgorithm
};