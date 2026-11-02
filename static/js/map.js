/**
 * OptiRoute Interactive Map Controller (Leaflet.js)
 * Clean Light Street Theme with Custom WH & Numbered Stop Markers
 */

class OptiRouteMap {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.depotMarker = null;
    this.stopMarkers = [];
    this.routePolyline = null;

    this.initMap();
  }

  initMap() {
    // Default initial center (Chennai)
    const initialCenter = [13.0827, 80.2707];

    this.map = L.map(this.containerId, {
      center: initialCenter,
      zoom: 12,
      zoomControl: false
    });

    // Top-right zoom controls matching screenshot
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // Clean OpenStreetMap Street Tiles matching the screenshot
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);
  }

  setDepot(depot, onDragEndCallback = null) {
    if (this.depotMarker) {
      this.map.removeLayer(this.depotMarker);
    }

    const lat = parseFloat(depot.lat);
    const lng = parseFloat(depot.lng);

    const depotIcon = L.divIcon({
      className: 'leaflet-custom-marker',
      html: `
        <div class="leaflet-warehouse-marker">
          <div class="warehouse-marker-pin"><i class="fa-solid fa-house"></i></div>
          <div class="warehouse-marker-label">WH</div>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 38]
    });

    this.depotMarker = L.marker([lat, lng], {
      icon: depotIcon,
      draggable: true
    }).addTo(this.map);

    this.depotMarker.bindPopup(`
      <div style="font-family: var(--font-family); padding: 2px;">
        <strong style="color: #2563eb; font-size: 12px;"><i class="fa-solid fa-warehouse"></i> Warehouse (Start/End)</strong>
        <p style="margin: 4px 0; font-size: 11.5px; font-weight: 600;">${depot.name}</p>
        <span style="font-family: var(--font-mono); font-size: 11px; color: #64748b;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
      </div>
    `);

    if (onDragEndCallback) {
      this.depotMarker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        onDragEndCallback(newPos.lat, newPos.lng);
      });
    }
  }

  renderStops(stops, onRemoveCallback = null, visitOrderMap = null) {
    // Clear existing stop markers
    this.stopMarkers.forEach(m => this.map.removeLayer(m));
    this.stopMarkers = [];

    stops.forEach((stop, index) => {
      const lat = parseFloat(stop.lat);
      const lng = parseFloat(stop.lng);

      const visitInfo = visitOrderMap ? visitOrderMap[index] : null;
      const markerText = visitInfo ? visitInfo.order : (index + 1);
      const markerBg = visitInfo ? '#4f46e5' : '#10b981';

      const stopIcon = L.divIcon({
        className: 'leaflet-custom-marker',
        html: `<div class="leaflet-stop-marker" style="background: ${markerBg}; border-color: ${visitInfo ? '#c7d2fe' : '#ffffff'};">${markerText}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([lat, lng], { icon: stopIcon }).addTo(this.map);

      let popupContent = `
        <div style="font-family: var(--font-family); padding: 2px; min-width: 150px;">
          ${visitInfo 
            ? `<div style="background: #e0e7ff; color: #4338ca; font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-bottom: 4px; display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-flag-checkered"></i> Stop #${visitInfo.order} in Route
               </div>`
            : `<strong style="font-size: 12px; color: #10b981;">Stop #${index + 1}</strong>`
          }
          <p style="margin: 4px 0 2px 0; font-size: 12px; font-weight: 600; color: #0f172a;">${stop.name}</p>
          <span style="font-family: var(--font-mono); font-size: 10.5px; color: #64748b;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
          ${visitInfo && visitInfo.legDist 
            ? `<div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #475569;">
                Leg drive: <strong>${visitInfo.legDist} km</strong> (~${visitInfo.legTime} min)
               </div>`
            : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      this.stopMarkers.push(marker);
    });
  }

  panTo(lat, lng, zoom = 14) {
    this.map.setView([lat, lng], zoom, { animate: true });
  }

  renderRoute(coordinates) {
    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }

    if (!coordinates || coordinates.length < 2) return;

    const latLngs = coordinates.map(c => [c[0], c[1]]);

    // Violet/indigo polyline matching the screenshot with slight dash
    this.routePolyline = L.polyline(latLngs, {
      color: '#6366f1',
      weight: 3.5,
      opacity: 0.9,
      dashArray: '8, 6',
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(this.map);

    this.fitBoundsAll();
  }

  clearRoute() {
    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
  }

  fitBoundsAll() {
    const allCoords = [];
    if (this.depotMarker) {
      allCoords.push(this.depotMarker.getLatLng());
    }
    this.stopMarkers.forEach(m => allCoords.push(m.getLatLng()));

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }
}

window.OptiRouteMap = OptiRouteMap;
