/**
 * Configuration and API Key Manager for OptiRoute (Node.js).
 * Supports OpenRouteService, Mapbox, Google Maps, Geoapify, and OSRM providers.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ENV_FILE = path.join(__dirname, '.env');

function loadEnvConfig() {
  const config = {
    OPENROUTESERVICE_API_KEY: process.env.OPENROUTESERVICE_API_KEY || '',
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || '',
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
    GEOAPIFY_API_KEY: process.env.GEOAPIFY_API_KEY || '',
    ACTIVE_ROUTING_PROVIDER: process.env.ACTIVE_ROUTING_PROVIDER || 'osrm'
  };

  if (fs.existsSync(ENV_FILE)) {
    try {
      const content = fs.readFileSync(ENV_FILE, 'utf-8');
      const parsed = dotenv.parse(content);
      Object.assign(config, parsed);
    } catch (e) {
      console.error(`Error reading .env: ${e.message}`);
    }
  }

  return config;
}

function saveEnvConfig(updates = {}) {
  const current = loadEnvConfig();
  Object.assign(current, updates);

  const lines = [
    '# OptiRoute API Configuration',
    '# Configured via OptiRoute Web Interface',
    `OPENROUTESERVICE_API_KEY=${current.OPENROUTESERVICE_API_KEY || ''}`,
    `MAPBOX_ACCESS_TOKEN=${current.MAPBOX_ACCESS_TOKEN || ''}`,
    `GOOGLE_MAPS_API_KEY=${current.GOOGLE_MAPS_API_KEY || ''}`,
    `GEOAPIFY_API_KEY=${current.GEOAPIFY_API_KEY || ''}`,
    `ACTIVE_ROUTING_PROVIDER=${current.ACTIVE_ROUTING_PROVIDER || 'osrm'}`
  ];

  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf-8');

  // Update runtime process.env
  for (const [k, v] of Object.entries(current)) {
    process.env[k] = v;
  }
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

module.exports = {
  loadEnvConfig,
  saveEnvConfig,
  maskKey
};
