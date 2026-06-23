const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Replace dark tile backgrounds with glass-like semi-transparent whites
html = html.replace(/fill="#0f1f3a"/g, 'fill="rgba(255,255,255,0.1)"');

// Change stroke colors to be visible on dark background if necessary
html = html.replace(/stroke="rgba\(148,163,184,0.15\)"/g, 'stroke="rgba(255,255,255,0.2)"');
html = html.replace(/fill="#64748b"/g, 'fill="#cbd5e1"'); // SVG text labels
html = html.replace(/stroke="#64748b"/g, 'stroke="#cbd5e1"'); // Clock strokes

fs.writeFileSync(htmlPath, html);
console.log('Successfully updated index.html SVG colors.');
