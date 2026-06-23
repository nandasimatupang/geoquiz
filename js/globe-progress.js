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

function resize() {
  if (!globeContainer || !globeCanvas || !isVisible) return;
  const rect = globeContainer.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  width = rect.width || 500;
  height = rect.height || 400;
  globeCanvas.width = width * dpr;
  globeCanvas.height = height * dpr;
  context.scale(dpr, dpr);
  
  if (projection) {
    projection.translate([width / 2, height / 2]).scale(Math.min(width, height) * 0.45);
  }
  render();
}

function render() {
  if (!context || !projection || !path || !isVisible) return;
  
  context.clearRect(0, 0, width, height);

  // Draw ocean
  context.beginPath();
  path({ type: 'Sphere' });
  context.fillStyle = '#38bdf8'; // Light ocean blue
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  context.stroke();

  // Draw countries
  worldFeatures.forEach(country => {
    context.beginPath();
    path(country.feature);
    
    // Check if found
    if (foundSet.has(normalize(country.name))) {
      context.fillStyle = '#166534'; // Dark green for found
    } else {
      context.fillStyle = '#86efac'; // Light green for unfound
    }
    
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.1)';
    context.lineWidth = 0.5;
    context.stroke();
  });
}

export function initGlobe(allMapCountries) {
  worldFeatures = allMapCountries;
  globeCanvas = $('globe-canvas');
  globeContainer = $('globe-container');
  if (!globeCanvas || !globeContainer) return;
  
  context = globeCanvas.getContext('2d');
  
  // Use d3.geoOrthographic if d3 is available
  if (window.d3) {
    projection = d3.geoOrthographic();
    path = d3.geoPath(projection, context);
    
    d3.select(globeContainer)
      .call(d3.drag()
        .on('start', () => { isDragging = true; globeContainer.style.cursor = 'grabbing'; })
        .on('drag', (event) => {
          const rotate = projection.rotate();
          const k = 75 / projection.scale();
          projection.rotate([
            rotate[0] + event.dx * k,
            rotate[1] - event.dy * k
          ]);
          render();
        })
        .on('end', () => { 
          isDragging = false; 
          globeContainer.style.cursor = 'grab'; 
        })
      );
  }
  
  window.addEventListener('resize', resize);
}

export function showGlobe(foundCountriesSet) {
  isVisible = true;
  foundSet = foundCountriesSet;
  if (globeContainer) {
    globeContainer.classList.remove('hidden');
    // Rotate to a nice default angle showing a lot of land
    if (projection) projection.rotate([-10, -20]); 
  }
  resize(); // Trigger initial resize and render
}

export function hideGlobe() {
  isVisible = false;
  if (globeContainer) globeContainer.classList.add('hidden');
}

export function setGlobeFound(foundCountriesSet) {
  foundSet = foundCountriesSet;
  if (isVisible) render();
}
