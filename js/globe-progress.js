import { $ } from './utils.js';
import { normalize } from './utils.js';

let globeCanvas = null;
let globeContainer = null;
let context = null;
let width = 500;
let height = 400;
let projection = null;
let path = null;
let worldFeatures = [];
let foundSet = new Set();
let isDragging = false;
let isVisible = false;
let renderPending = false;
let lastFoundHash = '';
let momentum = null;
let momentumFrame = null;

// ── Helpers ──

function computeFoundHash() {
  let h = 0;
  for (const v of foundSet) {
    for (let i = 0; i < v.length; i++) {
      h = ((h << 5) - h) + v.charCodeAt(i);
      h = h & h;
    }
  }
  return String(h);
}

function resize() {
  if (!globeContainer || !globeCanvas || !isVisible) return;
  const rect = globeContainer.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  width = rect.width || 500;
  height = rect.height || 400;
  globeCanvas.width = width * dpr;
  globeCanvas.height = height * dpr;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (projection) {
    projection.translate([width / 2, height / 2]).scale(Math.min(width, height) * 0.45);
  }
  scheduleRender();
}

// ── Main Render ──

function doRender() {
  if (!context || !projection || !path || !isVisible) return;
  renderPending = false;

  // Ocean (trivially cheap — single sphere path)
  context.beginPath();
  path({ type: 'Sphere' });
  context.fillStyle = '#09090b';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 1;
  context.stroke();

  // Countries
  worldFeatures.forEach(country => {
    context.beginPath();
    path(country.feature);

    if (foundSet.has(normalize(country.name))) {
      context.fillStyle = '#065f46';
    } else {
      context.fillStyle = '#34d399';
    }

    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.06)';
    context.lineWidth = 0.5;
    context.stroke();
  });
}

function scheduleRender() {
  if (renderPending || !isVisible) return;
  renderPending = true;
  requestAnimationFrame(() => {
    doRender();
  });
}

// ── Drag with momentum ──

function startMomentum(velocityX, velocityY) {
  stopMomentum();
  if (Math.abs(velocityX) < 0.02 && Math.abs(velocityY) < 0.02) return;
  momentum = { vx: velocityX, vy: velocityY };
  tickMomentum();
}

function tickMomentum() {
  if (!momentum) return;
  const rotate = projection.rotate();
  const k = 60 / projection.scale();
  projection.rotate([
    rotate[0] + momentum.vx * k,
    Math.max(-90, Math.min(90, rotate[1] - momentum.vy * k))
  ]);
  momentum.vx *= 0.92;
  momentum.vy *= 0.92;
  scheduleRender();

  if (Math.abs(momentum.vx) > 0.01 || Math.abs(momentum.vy) > 0.01) {
    momentumFrame = requestAnimationFrame(tickMomentum);
  } else {
    stopMomentum();
  }
}

function stopMomentum() {
  if (momentumFrame) {
    cancelAnimationFrame(momentumFrame);
    momentumFrame = null;
  }
  momentum = null;
}

// ── Public API ──

export function initGlobe(allMapCountries) {
  worldFeatures = allMapCountries;
  globeCanvas = $('globe-canvas');
  globeContainer = $('globe-container');
  if (!globeCanvas || !globeContainer) return;

  context = globeCanvas.getContext('2d');

  if (window.d3) {
    projection = d3.geoOrthographic();
    path = d3.geoPath(projection, context);

    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastTime = 0;
    let velocityX = 0;
    let velocityY = 0;

    d3.select(globeContainer)
      .call(d3.drag()
        .on('start', (event) => {
          stopMomentum();
          isDragging = true;
          globeContainer.style.cursor = 'grabbing';
          lastMouseX = event.x;
          lastMouseY = event.y;
          lastTime = performance.now();
          velocityX = 0;
          velocityY = 0;
        })
        .on('drag', (event) => {
          const dx = event.x - lastMouseX;
          const dy = event.y - lastMouseY;
          const now = performance.now();
          const dt = Math.max(1, now - lastTime);

          // Track velocity (moving average) for momentum on release
          velocityX = velocityX * 0.7 + (dx / dt) * 0.3;
          velocityY = velocityY * 0.7 + (dy / dt) * 0.3;

          const rotate = projection.rotate();
          const k = 60 / projection.scale();
          projection.rotate([
            rotate[0] + dx * k,
            Math.max(-90, Math.min(90, rotate[1] - dy * k))
          ]);

          lastMouseX = event.x;
          lastMouseY = event.y;
          lastTime = now;
          scheduleRender();
        })
        .on('end', () => {
          isDragging = false;
          globeContainer.style.cursor = 'grab';
          startMomentum(velocityX, velocityY);
        })
      );
  }

  window.addEventListener('resize', resize);
}

export function showGlobe(foundCountriesSet) {
  isVisible = true;
  foundSet = foundCountriesSet;
  lastFoundHash = computeFoundHash();
  if (globeContainer) {
    globeContainer.classList.remove('hidden');
    if (projection) projection.rotate([-10, -20]);
  }
  resize(); // triggers scheduleRender
}

export function hideGlobe() {
  isVisible = false;
  stopMomentum();
  if (globeContainer) globeContainer.classList.add('hidden');
}

export function setGlobeFound(foundCountriesSet) {
  foundSet = foundCountriesSet;
  const hash = computeFoundHash();
  if (hash !== lastFoundHash) {
    lastFoundHash = hash;
    if (isVisible) scheduleRender();
  }
}
