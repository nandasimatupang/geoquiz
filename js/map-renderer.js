import { feature } from 'topojson-client';
import { $ } from './utils.js';
import { normalize } from './utils.js';
import { ALL_COUNTRIES } from './data/countries.js';
import { TOPO_NAME_MAP } from './data/flags.js';

// Canvas setup
const MAP_ASPECT = 5 / 4;
let mapW = 500, mapH = 400;
let mapCtx = null;
// Lazy DOM refs — resolved on first use to avoid top-level null when module loads early
let _mapCanvas = null;
let _mapLoading = null;
function getMapCanvas() {
  if (!_mapCanvas) _mapCanvas = $('map-canvas');
  return _mapCanvas;
}
function getMapLoading() {
  if (!_mapLoading) _mapLoading = $('map-loading');
  return _mapLoading;
}

function initMapCanvas() {
  const mapCanvas = getMapCanvas();
  if (!mapCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = mapCanvas.getBoundingClientRect();
  const cssW = rect.width || 500;
  const cssH = cssW / MAP_ASPECT;
  mapW = cssW;
  mapH = cssH;
  mapCanvas.width = cssW * dpr;
  mapCanvas.height = cssH * dpr;
  mapCtx = mapCanvas.getContext('2d');
  mapCtx.scale(dpr, dpr);
}

function getBBox(feature) {
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  function walkCoords(coords) {
    if (typeof coords[0] === 'number') {
      const lon = coords[0], lat = coords[1];
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach((c) => walkCoords(c));
    }
  }
  walkCoords(feature.geometry.coordinates);
  return {
    cx: (minLon + maxLon) / 2,
    cy: (minLat + maxLat) / 2,
    w: maxLon - minLon,
    h: maxLat - minLat,
  };
}

export function drawCountryOutline(geoFeature) {
  if (!mapCtx) initMapCanvas();
  const ctx = mapCtx;
  const PAD = 0.05;

  const mapCanvas = getMapCanvas();
  const curRect = mapCanvas.getBoundingClientRect();
  if (Math.abs(curRect.width - mapW) > 1) initMapCanvas();

  const bbox = getBBox(geoFeature);
  if (bbox.w === 0 || bbox.h === 0) return;

  const latRad = (bbox.cy * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(latRad), 0.05);
  const adjW = bbox.w * cosLat;

  const scaleX = (mapW * (1 - 2 * PAD)) / adjW;
  const scaleY = (mapH * (1 - 2 * PAD)) / bbox.h;
  const scale = Math.min(scaleX, scaleY);

  const project = (lon, lat) => [
    mapW / 2 + (lon - bbox.cx) * cosLat * scale,
    mapH / 2 - (lat - bbox.cy) * scale,
  ];

  ctx.clearRect(0, 0, mapW, mapH);

  const geo = geoFeature.geometry;
  const polys = geo.type === 'Polygon' ? [geo.coordinates] : geo.coordinates;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Phase 1: fill
  polys.forEach((poly) => {
    poly.forEach((ring) => {
      ctx.beginPath();
      ring.forEach(([lon, lat], i) => {
        const [x, y] = project(lon, lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.save();
      ctx.shadowColor = 'rgba(6, 182, 212, 0.2)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#0d9488';
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#14b8a6';
      ctx.fill();
    });
  });

  // Phase 2: strokes
  polys.forEach((poly) => {
    poly.forEach((ring) => {
      ctx.beginPath();
      ring.forEach(([lon, lat], i) => {
        const [x, y] = project(lon, lat);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  });
}

// ── Draw target country + 4 nearest neighbors with highlighted target ──
// Cache centroids for fast neighbor lookups
let centroidCache = null;

function buildCentroidCache(allMapCountries) {
  const cache = {};
  allMapCountries.forEach(({ name, feature }) => {
    const bbox = getBBox(feature);
    cache[name] = { cx: bbox.cx, cy: bbox.cy };
  });
  return cache;
}

function findNeighbors(name, allMapCountries, count = 4) {
  if (!centroidCache) centroidCache = buildCentroidCache(allMapCountries);
  const target = centroidCache[name];
  if (!target) return [];
  const withDist = allMapCountries
    .filter((c) => c.name !== name)
    .map((c) => {
      const ct = centroidCache[c.name];
      if (!ct) return { ...c, dist: Infinity };
      // Approximate geographic distance using Haversine-like lon/lat diff
      const dLat = (ct.cy - target.cy) * 111;
      const dLon = (ct.cx - target.cx) * 111 * Math.cos((target.cy * Math.PI) / 180);
      return { ...c, dist: Math.sqrt(dLat * dLat + dLon * dLon) };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count);
  return withDist;
}

function drawMapFeatures(featuresWithStyles, projectFn) {
  if (!mapCtx) initMapCanvas();
  const ctx = mapCtx;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  featuresWithStyles.forEach(({ feature: feat, fill, stroke, strokeWidth, shadow }) => {
    const geo = feat.geometry;
    const polys = geo.type === 'Polygon' ? [geo.coordinates] : geo.coordinates;
    polys.forEach((poly) => {
      poly.forEach((ring) => {
        ctx.beginPath();
        ring.forEach(([lon, lat], i) => {
          const [x, y] = projectFn(lon, lat);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        if (fill) {
          if (shadow) {
            ctx.save();
            ctx.shadowColor = shadow.color;
            ctx.shadowBlur = shadow.blur;
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.restore();
          }
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }
      });
    });
  });
}

export function drawCountryWithNeighbors(targetName, allMapCountries) {
  if (!mapCtx) initMapCanvas();
  const ctx = mapCtx;
  const PAD = 0.06;

  const mapCanvas = getMapCanvas();
  const curRect = mapCanvas.getBoundingClientRect();
  if (Math.abs(curRect.width - mapW) > 1) initMapCanvas();

  const target = allMapCountries.find((c) => c.name === targetName);
  if (!target) return;

  const neighbors = findNeighbors(targetName, allMapCountries, 4);
  const drawCountries = [target, ...neighbors].filter(Boolean);
  const allFeatures = drawCountries.map((c) => c.feature);

  // Compute combined bbox for all drawn features
  const bbox = getCombinedBBox(allFeatures);
  if (bbox.w === 0 || bbox.h === 0) {
    drawCountryOutline(target.feature);
    return;
  }

  const latRad = (bbox.cy * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(latRad), 0.05);
  const adjW = bbox.w * cosLat;

  const scaleX = (mapW * (1 - 2 * PAD)) / adjW;
  const scaleY = (mapH * (1 - 2 * PAD)) / bbox.h;
  const scale = Math.min(scaleX, scaleY);

  const project = (lon, lat) => [
    mapW / 2 + (lon - bbox.cx) * cosLat * scale,
    mapH / 2 - (lat - bbox.cy) * scale,
  ];

  ctx.clearRect(0, 0, mapW, mapH);

  // Layer 1: neighbor countries (faint fill, visible border)
  const neighborFeatures = neighbors.map((n) => ({
    feature: n.feature,
    fill: 'rgba(20, 184, 166, 0.10)',
    stroke: 'rgba(0, 0, 0, 0.30)',
    strokeWidth: 1.5,
    shadow: null,
  }));
  drawMapFeatures(neighborFeatures, project);

  // Layer 2: target country (shadow glow + prominent fill)
  const targetFeatures = [
    {
      feature: target.feature,
      fill: '#0d9488',
      stroke: 'rgba(6, 182, 212, 0.12)',
      strokeWidth: 12,
      shadow: { color: 'rgba(6, 182, 212, 0.3)', blur: 25 },
    },
    {
      feature: target.feature,
      fill: '#14b8a6',
      stroke: null,
      strokeWidth: 0,
      shadow: null,
    },
    {
      feature: target.feature,
      fill: null,
      stroke: '#06b6d4',
      strokeWidth: 3,
      shadow: null,
    },
    {
      feature: target.feature,
      fill: null,
      stroke: 'rgba(245, 158, 11, 0.25)',
      strokeWidth: 1.5,
      shadow: null,
    },
  ];
  drawMapFeatures(targetFeatures, project);
}

function getCombinedBBox(features) {
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  function walkCoords(coords) {
    if (typeof coords[0] === 'number') {
      const lon = coords[0], lat = coords[1];
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach((c) => walkCoords(c));
    }
  }
  features.forEach((f) => walkCoords(f.geometry.coordinates));
  return {
    cx: (minLon + maxLon) / 2,
    cy: (minLat + maxLat) / 2,
    w: maxLon - minLon,
    h: maxLat - minLat,
  };
}

// Fetch TopoJSON data and match countries
let mapTopoData = null;
let mapFetchingPromise = null;

export async function fetchTopoData() {
  if (mapTopoData) return mapTopoData;
  if (mapFetchingPromise) return mapFetchingPromise;

  mapFetchingPromise = (async () => {
    const mapLoading = getMapLoading();
    const mapCanvas = getMapCanvas();
    if (mapLoading) {
      mapLoading.textContent = '🗺️ Loading world map...';
      mapLoading.classList.remove('hidden');
    }
    if (mapCanvas) mapCanvas.classList.add('hidden');

    try {
      const res = await fetch('https://unpkg.com/world-atlas@2/countries-50m.json');
      const world = await res.json();
      const countries = feature(world, world.objects.countries).features;

      const mapCountries = [];
      countries.forEach((f) => {
        const name = f.properties.name;
        const mapped = TOPO_NAME_MAP[name];
        if (mapped) {
          mapCountries.push({ name: mapped, feature: f });
          return;
        }
        const match = ALL_COUNTRIES.find((c) => normalize(c) === normalize(name));
        if (match) mapCountries.push({ name: match, feature: f });
      });

      mapTopoData = mapCountries;
      if (mapLoading) mapLoading.classList.add('hidden');
      if (mapCanvas) mapCanvas.classList.remove('hidden');
      return mapCountries;
    } catch (e) {
      if (mapLoading) {
        mapLoading.textContent = '❌ Failed to load map data. Refresh to retry.';
        mapLoading.classList.remove('hidden');
      }
      return [];
    }
  })();

  return mapFetchingPromise;
}
