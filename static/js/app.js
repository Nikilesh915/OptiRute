/**
 * OptiRoute Application Logic & State Controller
 * Matches the clean light dashboard UI
 */

class OptiRouteApp {
  constructor() {
    this.mapController = null;
    this.benchmarkChart = null;

    this.state = {
      presets: [],
      activePresetId: 'chennai',
      depot: {
        id: 'depot-chennai',
        name: 'Central Logistics Hub (Warehouse)',
        lat: 13.0827,
        lng: 80.2707,
        traffic: 'low',
        road_condition: 'paved'
      },
      stops: [
        { id: 'chn-1', name: 'Guindy Industrial Park', lat: 13.0102, lng: 80.2157 },
        { id: 'chn-2', name: 'Anna Nagar Supercenter', lat: 13.0850, lng: 80.2101 },
        { id: 'chn-3', name: 'Royapuram Express', lat: 13.1147, lng: 80.2872 },
        { id: 'chn-4', name: 'T. Nagar Retail Hub', lat: 13.0418, lng: 80.2341 },
        { id: 'chn-5', name: 'Mylapore Distribution Point', lat: 13.0368, lng: 80.2676 },
        { id: 'chn-6', name: 'Nungambakkam Commercial Centre', lat: 13.0595, lng: 80.2435 }
      ],
      lastOptimizationResult: null,
      isDashboardCollapsed: false
    };

    this.init();
  }

  async init() {
    // 1. Initialize Map
    this.mapController = new OptiRouteMap('map');

    // 2. Setup DOM Events
    this.bindEvents();

    // 3. Load presets from backend
    await this.fetchPresets();

    // 4. Initial rendering of Depot & Stops
    this.updateDepotDisplay();
    this.renderStopsList();
    this.mapController.setDepot(this.state.depot, (newLat, newLng) => {
      this.state.depot.lat = newLat;
      this.state.depot.lng = newLng;
      this.updateDepotDisplay();
    });

  }

  bindEvents() {
    // Sample Presets button & modal
    const btnSamplePresets = document.getElementById('btnSamplePresets');
    const modalPresets = document.getElementById('modalPresets');
    const btnClosePresets = document.getElementById('btnClosePresets');

    btnSamplePresets.addEventListener('click', () => {
      modalPresets.classList.add('active');
    });

    btnClosePresets.addEventListener('click', () => {
      modalPresets.classList.remove('active');
    });

    modalPresets.addEventListener('click', (e) => {
      if (e.target === modalPresets) {
        modalPresets.classList.remove('active');
      }
    });

    // Clear All button
    document.getElementById('btnClearAll').addEventListener('click', () => {
      this.clearAll();
    });

    // Manual Coordinate Input form
    document.getElementById('formAddCoord').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddCoordinate();
    });

    // Optimize Button
    document.getElementById('btnOptimize').addEventListener('click', () => {
      this.runOptimization();
    });

    // Recenter Map Button
    document.getElementById('btnRecenter').addEventListener('click', () => {
      this.mapController.fitBoundsAll();
    });

    // Toggle Dashboard Collapse
    document.getElementById('btnToggleDashboard').addEventListener('click', () => {
      this.toggleDashboard();
    });

    // Toggle Itinerary Leg Details
    document.getElementById('itineraryToggleDetails').addEventListener('click', () => {
      const wrapper = document.getElementById('itineraryLegsTableWrapper');
      const icon = document.getElementById('itineraryToggleIcon');
      const text = document.getElementById('itineraryToggleText');
      if (wrapper.style.display === 'none') {
        wrapper.style.display = 'block';
        icon.className = 'fa-solid fa-chevron-up';
        text.textContent = 'Hide Details';
      } else {
        wrapper.style.display = 'none';
        icon.className = 'fa-solid fa-chevron-down';
        text.textContent = 'Show Details';
      }
    });

    // Map click fills coordinate inputs
    this.mapController.map.on('click', (e) => {
      document.getElementById('inputLat').value = e.latlng.lat.toFixed(4);
      document.getElementById('inputLng').value = e.latlng.lng.toFixed(4);
      const nextNum = this.state.stops.length + 1;
      document.getElementById('inputLabel').value = `Stop #${nextNum}`;
    });
  }

  async fetchPresets() {
    try {
      const resp = await fetch('/api/presets');
      const data = await resp.json();
      this.state.presets = data.presets || [];
      this.renderPresetsModal();
    } catch (e) {
      console.error('Error fetching presets:', e);
    }
  }

  renderPresetsModal() {
    const container = document.getElementById('presetsListModal');
    if (!container) return;
    container.innerHTML = '';

    this.state.presets.forEach(p => {
      const card = document.createElement('div');
      card.className = 'preset-item-card';
      card.innerHTML = `
        <div class="preset-item-name">${p.name}</div>
        <div class="preset-item-desc">${p.description || ''} (${p.stops ? p.stops.length : 0} delivery stops)</div>
      `;
      card.addEventListener('click', () => {
        this.loadPreset(p.id);
        document.getElementById('modalPresets').classList.remove('active');
      });
      container.appendChild(card);
    });
  }

  loadPreset(presetId) {
    const preset = this.state.presets.find(p => p.id === presetId);
    if (!preset) return;

    this.state.activePresetId = presetId;
    this.state.depot = JSON.parse(JSON.stringify(preset.depot));
    this.state.stops = JSON.parse(JSON.stringify(preset.stops));

    this.updateDepotDisplay();
    this.renderStopsList();

    this.mapController.setDepot(this.state.depot, (newLat, newLng) => {
      this.state.depot.lat = newLat;
      this.state.depot.lng = newLng;
      this.updateDepotDisplay();
    });

    this.mapController.renderStops(this.state.stops);
    this.mapController.fitBoundsAll();
    this.resetDashboardState();
  }

  updateDepotDisplay() {
    document.getElementById('depotName').textContent = this.state.depot.name;
    document.getElementById('depotCoords').textContent = `${parseFloat(this.state.depot.lat).toFixed(4)}, ${parseFloat(this.state.depot.lng).toFixed(4)}`;

    const totalConfigured = 1 + this.state.stops.length;
    document.getElementById('configuredHeader').textContent = `3. CONFIGURED LOCATIONS (${totalConfigured})`;
    document.getElementById('stopsSubheaderText').textContent = `Delivery Stops (${this.state.stops.length})`;
  }

  renderStopsList() {
    const container = document.getElementById('stopsContainer');
    container.innerHTML = '';

    if (this.state.stops.length === 0) {
      container.innerHTML = `
        <div style="font-size: 11.5px; color: var(--text-muted); text-align: center; padding: 16px;">
          No delivery stops added.<br>Enter coordinates above or click on map.
        </div>
      `;
    } else {
      this.state.stops.forEach((stop, index) => {
        const card = document.createElement('div');
        card.className = 'stop-row-card';
        card.innerHTML = `
          <div class="stop-left-content">
            <div class="stop-badge-circle">${index + 1}</div>
            <div class="stop-info">
              <div class="stop-name" title="${stop.name}">${stop.name}</div>
              <div class="stop-coords">${parseFloat(stop.lat).toFixed(4)}, ${parseFloat(stop.lng).toFixed(4)}</div>
            </div>
          </div>
          <button class="btn-remove-stop" title="Remove stop" onclick="window.optiApp.removeStop(${index})">
            &times;
          </button>
        `;
        container.appendChild(card);
      });
    }

    this.mapController.renderStops(this.state.stops);
    this.updateDepotDisplay();
  }

  removeStop(index) {
    this.state.stops.splice(index, 1);
    this.renderStopsList();
    this.resetDashboardState();
  }

  handleAddCoordinate() {
    const lat = parseFloat(document.getElementById('inputLat').value);
    const lng = parseFloat(document.getElementById('inputLng').value);
    const label = document.getElementById('inputLabel').value.trim();
    const type = document.getElementById('selectPointType').value;

    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid numeric latitude and longitude.');
      return;
    }

    if (type === 'warehouse') {
      this.state.depot = {
        id: `depot-${Date.now()}`,
        name: label || 'Custom Warehouse',
        lat: lat,
        lng: lng,
        traffic: 'low',
        road_condition: 'paved'
      };
      this.updateDepotDisplay();
      this.mapController.setDepot(this.state.depot, (newLat, newLng) => {
        this.state.depot.lat = newLat;
        this.state.depot.lng = newLng;
        this.updateDepotDisplay();
      });
    } else {
      const nextIndex = this.state.stops.length + 1;
      this.state.stops.push({
        id: `stop-${Date.now()}`,
        name: label || `Delivery Stop #${nextIndex}`,
        lat: lat,
        lng: lng,
        traffic: 'medium',
        road_condition: 'paved'
      });
      this.renderStopsList();
    }

    // Reset inputs
    document.getElementById('inputLat').value = '';
    document.getElementById('inputLng').value = '';
    document.getElementById('inputLabel').value = '';

    this.mapController.fitBoundsAll();
    this.resetDashboardState();
  }

  clearAll() {
    this.state.stops = [];
    this.renderStopsList();
    this.resetDashboardState();
    document.getElementById('mapRouteStatusText').textContent = 'Stops cleared. Ready for input.';
    document.getElementById('kpiTotalStops').textContent = '0 Stops';
  }

  resetDashboardState() {
    this.mapController.clearRoute();
    document.getElementById('mapRouteStatusText').textContent = 'Ready. Click \'Optimize Delivery Route\' to begin.';
    const dot = document.querySelector('.status-indicator-dot');
    if (dot) dot.style.background = '#94a3b8';
    const pill = document.getElementById('winnerPill');
    if (pill) {
      pill.textContent = 'Ready to Optimize';
      pill.style.background = '#e2e8f0';
      pill.style.color = '#475569';
    }
    document.getElementById('routeSummaryHeadline').textContent = 'Awaiting Optimization';
    document.getElementById('kpiBestDistance').innerHTML = `-- <span class="unit">km</span>`;
    document.getElementById('kpiBestTime').innerHTML = `-- <span class="unit">ms</span>`;
    document.getElementById('kpiWinningAlgo').textContent = '--';
    document.getElementById('kpiTotalStops').textContent = `${this.state.stops.length} Stops`;
    document.getElementById('comparisonTableBody').innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 18px;">
          Click "Optimize Delivery Route" to run algorithms and compare performance.
        </td>
      </tr>
    `;
    if (this.benchmarkChart) {
      this.benchmarkChart.destroy();
      this.benchmarkChart = null;
    }

    // Hide itinerary section and reset its state
    const itinSection = document.getElementById('itinerarySection');
    if (itinSection) itinSection.style.display = 'none';
    const legsWrapper = document.getElementById('itineraryLegsTableWrapper');
    if (legsWrapper) legsWrapper.style.display = 'none';
    const toggleText = document.getElementById('itineraryToggleText');
    if (toggleText) toggleText.textContent = 'Show Details';
    const toggleIcon = document.getElementById('itineraryToggleIcon');
    if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-down';
  }

  toggleDashboard() {
    this.state.isDashboardCollapsed = !this.state.isDashboardCollapsed;
    const body = document.getElementById('resultsBody');
    const icon = document.querySelector('#btnToggleDashboard i');
    if (this.state.isDashboardCollapsed) {
      body.style.display = 'none';
      icon.className = 'fa-solid fa-chevron-down';
    } else {
      body.style.display = 'flex';
      icon.className = 'fa-solid fa-chevron-up';
    }
  }

  /* ==========================================================================
     Optimization Engine & API Call
     ========================================================================== */

  async runOptimization() {
    if (this.state.stops.length < 1) {
      alert('Please add at least 1 delivery stop.');
      return;
    }

    const btn = document.getElementById('btnOptimize');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Optimizing...`;

    const algoChoice = document.getElementById('selectAlgorithm').value;
    let selectedAlgos = [];

    if (algoChoice === 'all3') {
      selectedAlgos = ['sa', 'ga', 'aco'];
    } else if (algoChoice === 'all') {
      selectedAlgos = ['sa', 'ga', 'aco', 'two_opt', 'dp'];
    } else {
      selectedAlgos = [algoChoice];
    }

    const locations = [this.state.depot, ...this.state.stops];

    const payload = {
      locations: locations,
      algorithms: selectedAlgos,
      objective: 'shortest_distance', // Prioritizes shortest distance route
      weight_distance: 0.8,
      weight_time: 0.2,
      coordinate_type: 'gps'
    };

    try {
      const resp = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();

      if (data.status === 'success') {
        this.state.lastOptimizationResult = data;
        this.displayOptimizationResults(data);
      } else {
        alert(data.error || 'Optimization error');
      }
    } catch (e) {
      console.error('Optimization request failed:', e);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-play"></i> Optimize Delivery Route`;
    }
  }

  displayOptimizationResults(data) {
    const rec = data.recommendation;
    const algos = data.algorithms_comparison;
    const winningAlgoName = data.recommended_algorithm;

    const bestResult = algos.find(a => a.algorithm === winningAlgoName) || algos[0];
    const dist = bestResult.total_distance_km ? bestResult.total_distance_km.toFixed(2) : '--';
    const execTime = bestResult.execution_time_ms ? bestResult.execution_time_ms.toFixed(1) : '0.0';

    // 1. Update Map Top-Left Floating Pill
    const cleanAlgoName = winningAlgoName.replace(/\s*\(.*?\)\s*/g, '');
    document.getElementById('mapRouteStatusText').textContent = `Optimized using ${cleanAlgoName} (${dist} km)`;
    const dot = document.querySelector('.status-indicator-dot');
    if (dot) dot.style.background = '#10b981';

    // 2. Update Results Dashboard Header
    const winnerPill = document.getElementById('winnerPill');
    winnerPill.textContent = `${cleanAlgoName} Winner`;
    winnerPill.style.background = '#d1fae5';
    winnerPill.style.color = '#065f46';
    document.getElementById('routeSummaryHeadline').textContent = `Optimized Route: ${dist} km in ${execTime}ms`;

    // 3. Update 4 KPI Cards
    document.getElementById('kpiBestDistance').innerHTML = `${dist} <span class="unit">km</span>`;
    document.getElementById('kpiBestTime').innerHTML = `${execTime} <span class="unit">ms</span>`;
    document.getElementById('kpiWinningAlgo').textContent = cleanAlgoName;
    document.getElementById('kpiTotalStops').textContent = `${this.state.stops.length} Stops`;

    // 4. Update Comparison Table
    this.renderComparisonTable(algos, winningAlgoName);

    // 5. Update Benchmark Chart
    this.renderBenchmarkChart(algos);

    // 6. Render Winning Route on Map
    const roadCoords = (data.road_geometries && data.road_geometries[winningAlgoName]) || bestResult.route_coordinates;
    this.mapController.renderRoute(roadCoords);

    // 7. Display Optimized Stop Order & Itinerary
    this.displayItinerary(data);
  }

  /**
   * Renders the Optimized Stop Order section:
   *  - Horizontal node sequence (Depot → Stop → … → Depot)
   *  - Collapsible leg-by-leg breakdown table
   *  - Updates map markers with visit-order numbers
   */
  displayItinerary(data) {
    const algos = data.algorithms_comparison;
    const winningAlgoName = data.recommended_algorithm;
    const bestResult = algos.find(a => a.algorithm === winningAlgoName) || algos[0];

    if (!bestResult.tour || bestResult.tour.length < 2) return;

    const tour = bestResult.tour;       // e.g. [0, 3, 1, 5, 2, 4, 0]
    const legs = bestResult.legs || [];
    const locations = (data.matrix_summary && data.matrix_summary.locations) || [];

    // Show itinerary section
    document.getElementById('itinerarySection').style.display = 'block';

    // Stats pill
    const totalDist = bestResult.total_distance_km ? bestResult.total_distance_km.toFixed(2) : '--';
    const totalTime = bestResult.travel_time_formatted || '--';
    document.getElementById('itineraryStatsPill').textContent = `${totalDist} km · ${totalTime}`;
    document.getElementById('itineraryLegsCount').textContent = legs.length;

    // ── Build horizontal sequence flow ──
    const scrollContainer = document.getElementById('itinerarySequenceScroll');
    scrollContainer.innerHTML = '';

    for (let i = 0; i < tour.length; i++) {
      const locIdx = tour[i];
      const isDepot = (locIdx === 0);
      const loc = locations[locIdx] || {};
      const name = loc.name || (isDepot ? 'Warehouse' : `Stop ${locIdx}`);
      const lat = parseFloat(loc.lat || 0).toFixed(4);
      const lng = parseFloat(loc.lng || 0).toFixed(4);

      const node = document.createElement('div');
      node.className = `itinerary-node ${isDepot ? 'itinerary-node-depot' : ''}`;
      node.innerHTML = `
        <div class="itinerary-node-badge ${isDepot ? 'depot' : ''}">${isDepot ? 'WH' : i}</div>
        <div class="itinerary-node-text">
          <div class="itinerary-node-name">${name}</div>
          <div class="itinerary-node-meta">${lat}, ${lng}</div>
        </div>
      `;
      // Click to pan map to this location
      node.addEventListener('click', () => {
        this.mapController.panTo(parseFloat(loc.lat || 0), parseFloat(loc.lng || 0));
      });
      scrollContainer.appendChild(node);

      // Arrow connector between nodes (not after the last)
      if (i < tour.length - 1) {
        const arrow = document.createElement('div');
        arrow.className = 'itinerary-arrow';
        arrow.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
        scrollContainer.appendChild(arrow);
      }
    }

    // ── Build legs table ──
    const legsBody = document.getElementById('itineraryLegsBody');
    legsBody.innerHTML = '';
    legs.forEach((leg, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="itinerary-step-badge">${idx + 1}</span></td>
        <td>${leg.from_name}</td>
        <td style="text-align: center; color: #94a3b8;"><i class="fa-solid fa-arrow-right"></i></td>
        <td>${leg.to_name}</td>
        <td><strong>${leg.distance_km} km</strong></td>
        <td>${leg.travel_time_min} min</td>
        <td>${leg.traffic_factor}× / ${leg.road_factor}×</td>
      `;
      legsBody.appendChild(tr);
    });

    // ── Build visitOrderMap and re-render map markers ──
    const visitOrderMap = {};
    for (let i = 1; i < tour.length - 1; i++) {   // skip depot at start & end
      const tourIdx = tour[i];
      const stopArrayIdx = tourIdx - 1;            // stops[] is 0-indexed, tour depot=0
      const leg = legs[i - 1] || {};
      visitOrderMap[stopArrayIdx] = {
        order: i,
        legDist: leg.distance_km,
        legTime: leg.travel_time_min
      };
    }
    this.mapController.renderStops(this.state.stops, null, visitOrderMap);
  }

  renderComparisonTable(algos, winningAlgoName) {
    const tbody = document.getElementById('comparisonTableBody');
    tbody.innerHTML = '';

    algos.forEach(algo => {
      const cleanName = algo.algorithm.replace(/\s*\(.*?\)\s*/g, '');
      const isWinner = (algo.algorithm === winningAlgoName);

      const tr = document.createElement('tr');
      const dist = algo.total_distance_km ? `${algo.total_distance_km.toFixed(2)} km` : '--';
      const timeMs = algo.execution_time_ms ? `${algo.execution_time_ms.toFixed(2)} ms` : '--';
      const iterations = algo.iterations || '--';

      tr.innerHTML = `
        <td><strong>${cleanName}</strong></td>
        <td>${dist}</td>
        <td>${timeMs}</td>
        <td>${iterations}</td>
        <td>
          ${isWinner 
            ? '<span class="badge-status-best">&#9733; Best Route</span>' 
            : '<span class="badge-status-completed">Completed</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderBenchmarkChart(algos) {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (this.benchmarkChart) {
      this.benchmarkChart.destroy();
    }

    const validAlgos = algos.filter(a => a.tour && !a.error);
    const labels = validAlgos.map(a => a.algorithm.replace(/\s*\(.*?\)\s*/g, ''));
    const distances = validAlgos.map(a => a.total_distance_km || 0);
    const executionTimes = validAlgos.map(a => a.execution_time_ms || 0);

    this.benchmarkChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Distance (km)',
            data: distances,
            backgroundColor: '#6366f1',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.8,
            yAxisID: 'y'
          },
          {
            label: 'Time (ms)',
            data: executionTimes,
            backgroundColor: '#10b981',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.8,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              color: '#64748b',
              font: { family: 'Inter', size: 11, weight: '500' }
            }
          },
          tooltip: {
            padding: 8,
            titleFont: { size: 11 },
            bodyFont: { size: 11 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#64748b',
              font: { family: 'Inter', size: 10.5 }
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Distance (km)',
              color: '#64748b',
              font: { size: 10 }
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 9.5 }
            },
            grid: {
              color: '#f1f5f9'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Time (ms)',
              color: '#64748b',
              font: { size: 10 }
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 9.5 }
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.optiApp = new OptiRouteApp();
});
