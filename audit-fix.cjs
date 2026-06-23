const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'css/style.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Hover backgrounds for secondary buttons and filters
css = css.replace(/background:\s*#f0fdff;/g, 'background: rgba(255, 255, 255, 0.1);');

// 2. Hover background for correct flag options
css = css.replace(/background:\s*#b8e8c8;/g, 'background: rgba(16, 185, 129, 0.2);');

// 3. Toast Text Colors
css = css.replace(/color:\s*#047857;/g, 'color: #6ee7b7;'); // Emerald-300
css = css.replace(/color:\s*#b91c1c;/g, 'color: #fca5a5;'); // Red-300

// 4. Update the darker green (#059669) on the continent filter/stats to be brighter (#34d399)
css = css.replace(/background:\s*#059669;/g, 'background: #34d399;');
css = css.replace(/border-color:\s*#059669;/g, 'border-color: #34d399;');

// 5. Check map multiple choice options background (just in case they were missed)
css = css.replace(/background:\s*#e0f7fa;/g, 'background: var(--bg-card);\n  backdrop-filter: var(--glass-filter);');
css = css.replace(/background:\s*#c8edf0;/g, 'background: rgba(14, 165, 233, 0.1);');

// 6. Ensure stats item backgrounds are glassmorphic
css = css.replace(/background:\s*rgba\(6, 182, 212, 0\.04\);/g, 'background: var(--bg-card);\n  backdrop-filter: var(--glass-filter);');
css = css.replace(/background:\s*rgba\(6, 182, 212, 0\.06\);/g, 'background: rgba(255, 255, 255, 0.05);');

// 7. Update Map Difficulty Active Button Background to fit glassmorphic dark mode better
css = css.replace(/background:\s*linear-gradient\(135deg, var\(--ocean-accent\), var\(--ocean-deep\)\);/g, 'background: linear-gradient(135deg, var(--ocean-accent), var(--ocean-deep));');

// 8. Fix any remaining color: #083344
css = css.replace(/color:\s*#083344;/g, 'color: var(--text-primary);');

// 9. Update stats-back-btn
css = css.replace(/\.stats-back-btn\s*\{[\s\S]*?\}/, `.stats-back-btn {
  background: var(--bg-card);
  backdrop-filter: var(--glass-filter);
  -webkit-backdrop-filter: var(--glass-filter);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 6px 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition);
  outline: none;
}`);

// 10. Update stats-reset-btn
css = css.replace(/\.stats-reset-btn\s*\{[\s\S]*?\}/, `.stats-reset-btn {
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 10px 24px;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  cursor: pointer;
  transition: all var(--transition);
  outline: none;
}`);

// 11. Fix stat cards to use glassmorphism
css = css.replace(/\.stat-card\s*\{[\s\S]*?\}/, `.stat-card {
  background: var(--bg-card);
  backdrop-filter: var(--glass-filter);
  -webkit-backdrop-filter: var(--glass-filter);
  border-radius: var(--radius-xl);
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}`);

// 12. Fix hero stat card
css = css.replace(/\.stat-card-hero\s*\{[\s\S]*?\}/, `.stat-card-hero {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%);
  border-color: rgba(14, 165, 233, 0.3);
}`);

fs.writeFileSync(cssPath, css);
console.log('Successfully applied all remaining dark theme fixes to style.css.');
