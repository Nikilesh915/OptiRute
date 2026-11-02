# OptiRoute: Delivery Route Optimization System (Node.js & Express.js)
### Powered by Computational Geometry & TSP Approximation Metaheuristics

![OptiRoute Banner](https://img.shields.io/badge/OptiRoute-v2.4%20Node.js-blue?style=for-the-badge&logo=nodedotjs)
![License](https://img.shields.io/badge/License-Academic%2FOpen-green?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=for-the-badge&logo=nodedotjs)
![Express.js](https://img.shields.io/badge/Express.js-4.x-black?style=for-the-badge&logo=express)
![Leaflet](https://img.shields.io/badge/Leaflet-v1.9-emerald?style=for-the-badge&logo=leaflet)

---

## 📌 1. Project Overview & Description

**OptiRoute** is a comprehensive, web-based delivery route optimization system designed for last-mile logistics dispatchers. Given a central warehouse depot and multiple customer delivery destinations, the system determines the most efficient visiting order using **Computational Geometry** and **TSP-based Approximation Algorithms**.

This version (`Opti_route2.0.2`) provides a **high-performance JavaScript / Node.js & Express.js backend** while preserving full compatibility with the existing web dashboard frontend.

### Real-World Operational Factors:
- **Spatial Coordinates:** Haversine great-circle spherical distance for geographic accuracy.
- **Traffic Congestion Multipliers ($\tau$):** Free flow ($1.0\times$), Moderate ($1.3\times$), Heavy ($1.8\times$), Severe ($2.3\times$).
- **Road Condition Modifiers ($\rho$):** Paved highway ($1.0\times$), Urban arterial ($1.2\times$), Rough/workzone ($1.5\times$), Poor ($1.8\times$).
- **Multi-Objective Route Recommendation:** Evaluates total distance, road travel time, algorithm execution latency, and geometric crossing penalties.

---

## 🔬 2. Grounded in Published Research

This implementation realizes the algorithmic principles and benchmarking parameters presented in:

> **"Algorithms and Optimization Techniques for Solving TSP"**  
> *Ramya Nemani, Ganga Rama Koteswara Rao, Jeevana Jyothi Pujari, Naresh Cherukuri, P V V S Srinivas, Chitturi Prasad*  
> *Proceedings of the 5th International Conference on I-SMAC (IoT in Social, Mobile, Analytics and Cloud), IEEE, 2021.*

### Implemented Algorithms:
1. **Simulated Annealing (SA):** Ultra-fast stochastic metaheuristic with geometric cooling ($T_{\max}=100^\circ$, $T_{\min}=1^\circ$, $L = 10 \times N$).
2. **Ant Colony Optimization (ACO):** Artificial ant swarm finding clean paths using artificial pheromone trails and distance visibility heuristics ($\alpha=1.0, \beta=2.0, \rho=0.1$).
3. **Genetic Algorithm (GA):** Population-based evolutionary search using Order Crossover (OX1), tournament selection, and mutation.
4. **2-Opt Local Search:** Eliminates self-intersecting segments in $O(N^2)$ time to guarantee a 2-optimal boundary.
5. **Exact Held-Karp Dynamic Programming:** Ground truth solver for $N \le 16$ to measure the empirical optimality gap.

---

## 📁 3. Project Directory Structure

```
Opti_route2.0.2/
├── algorithms/
│   ├── index.js                  # Package exports
│   ├── computationalGeometry.js  # Haversine, Convex Hull (Monotone Chain), edge crossing check
│   ├── costMatrix.js             # Multi-attribute cost matrix formulation
│   ├── twoOpt.js                 # 2-Opt local search & Nearest Neighbor
│   ├── simulatedAnnealing.js     # Simulated Annealing solver (Nemani et al.)
│   ├── antColony.js              # Ant Colony Optimization solver
│   ├── geneticAlgorithm.js       # Genetic Algorithm (OX1 + Tournament)
│   ├── dynamicProgramming.js     # Exact Held-Karp DP solver (N <= 16)
│   └── routeEvaluator.js         # Multi-criteria scoring & recommendations
├── static/
│   ├── css/
│   │   └── style.css             # Light modern dashboard theme
│   └── js/
│       ├── map.js                # Leaflet map, custom depot & numbered stop markers
│       └── app.js                # State management, API communication, Chart.js benchmark
├── templates/
│   └── index.html                # Responsive web dashboard
├── data/
│   └── presets.json              # Scenarios (Chennai, Visakhapatnam, Hyderabad, Bengaluru, etc.)
├── .env                          # API keys and active routing provider configuration
├── config.js                     # Config & API key manager with key masking
├── server.js                     # Express.js REST API backend server
├── test_api.js                   # Automated test suite
└── package.json                  # Node.js project manifest & dependencies
```

---

## 🚀 4. How to Run Locally

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (bundled with Node.js)

### Step 1: Install Dependencies
Open terminal / PowerShell in `Opti_route2.0.2`:
```powershell
npm install
```

### Step 2: Run Automated Tests
Verify that all algorithms and API endpoints pass:
```powershell
npm test
```

### Step 3: Launch the OptiRoute Server
```powershell
npm start
```
Or for development with automatic reload:
```powershell
npm run dev
```

### Step 4: Open in Browser
Navigate to:
```
http://127.0.0.1:5000
```

---

## 📡 5. REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | Serves the single-page delivery optimization dashboard |
| `/api/presets` | `GET` | Retrieves preconfigured city delivery scenarios |
| `/api/config` | `GET` | Returns active provider and masked API keys |
| `/api/config` | `POST` | Updates routing provider and API keys in `.env` |
| `/api/geocode` | `GET` | Geocodes an address or landmark query |
| `/api/generate_random` | `POST` | Generates synthetic delivery stops within a radius |
| `/api/optimize` | `POST` | Runs selected TSP algorithms and returns ranked metrics & geometries |
| `/api/benchmark` | `POST` | Runs scalability benchmark across problem sizes $N \in [6, 10, 15, 25, 40]$ |
