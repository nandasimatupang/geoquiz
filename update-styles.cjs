const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'css/style.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Replace root variables
css = css.replace(/:root\s*\{[\s\S]*?\}/, `:root {
  /* Premium Dark Theme */
  --ocean-light: #0f172a;
  --ocean-mid: #1e293b;
  --ocean-accent: #0ea5e9;
  --ocean-deep: #0284c7;
  --sky-blue: #38bdf8;
  --coral: #f43f5e;
  --coral-light: rgba(244, 63, 94, 0.15);
  --sunshine: #fbbf24;
  --sunshine-light: rgba(251, 191, 36, 0.15);
  --emerald: #10b981;
  --emerald-light: rgba(16, 185, 129, 0.15);
  --white: rgba(255, 255, 255, 0.05); /* Glass card background */
  --bg-card: rgba(30, 41, 59, 0.6);
  --bg-input: rgba(15, 23, 42, 0.5);
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --success: #10b981;
  --success-bg: rgba(16, 185, 129, 0.15);
  --error: #ef4444;
  --error-bg: rgba(239, 68, 68, 0.15);
  --warning: #f59e0b;
  --warning-bg: rgba(245, 158, 11, 0.15);
  --gold: #f59e0b;
  --border: rgba(255, 255, 255, 0.08);
  --radius: 16px;
  --radius-sm: 10px;
  --radius-xl: 20px;
  --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.4);
  --glass-filter: blur(16px);
  --neon-glow: 0 0 15px rgba(14, 165, 233, 0.4);
}`);

// 2. Replace body
css = css.replace(/body\s*\{[\s\S]*?\}/, `body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: radial-gradient(circle at 15% 50%, rgba(14, 165, 233, 0.15), transparent 40%),
              radial-gradient(circle at 85% 30%, rgba(244, 63, 94, 0.1), transparent 40%),
              linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%);
  background-attachment: fixed;
  color: var(--text-primary);
  min-height: 100vh;
  margin: 0;
}`);

// 3. Update global background: var(--white);
// Replace all background: var(--white) with glassmorphism + border
css = css.replace(/background:\s*var\(--white\);/g, `background: var(--bg-card);\n  backdrop-filter: var(--glass-filter);\n  -webkit-backdrop-filter: var(--glass-filter);\n  border: 1px solid var(--border);`);

// 4. Fix specific element borders that used rgba(6, 182, 212, 0.12) etc to just use var(--border)
css = css.replace(/border:\s*[\d.]+px\s+solid\s+rgba\(6,\s*182,\s*212,\s*[\d.]+\);/g, `border: 1px solid var(--border);`);
css = css.replace(/border:\s*1px\s+solid\s+rgba\(6,\s*182,\s*212,\s*[\d.]+\);/g, `border: 1px solid var(--border);`);

// 5. Update primary button
css = css.replace(/\.btn-primary\s*\{[\s\S]*?\}/, `.btn-primary {
  background: linear-gradient(135deg, var(--ocean-accent), var(--ocean-deep));
  color: #fff;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
}`);

// 6. Fix input backgrounds
css = css.replace(/background:\s*var\(--bg-input\);/g, `background: var(--bg-input);\n  backdrop-filter: blur(8px);`);

// 7. Add glow to primary button hover
css = css.replace(/\.btn-primary:hover:not\(:disabled\)\s*\{[\s\S]*?\}/, `.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--neon-glow), 0 6px 20px rgba(14, 165, 233, 0.45);
}`);

// 8. Add neon glow to game cards hover
css = css.replace(/\.game-card:hover\s*\{[\s\S]*?\}/, `.game-card:hover {
  transform: translateY(-5px);
  border-color: var(--ocean-accent);
  box-shadow: var(--neon-glow), var(--shadow-lg);
  background: rgba(30, 41, 59, 0.8);
}`);

// 9. Update text colors explicitly where they might have been hardcoded to dark colors
css = css.replace(/color:\s*#083344;/g, `color: var(--text-primary);`);
css = css.replace(/color:\s*#0f1f3a;/g, `color: var(--text-primary);`);
css = css.replace(/fill="#0f1f3a"/g, `fill="rgba(255,255,255,0.1)"`);

// 10. Update letter grid buttons
css = css.replace(/\.letter-btn\s*\{[\s\S]*?\}/, `.letter-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  background: var(--bg-card);
  backdrop-filter: var(--glass-filter);
  -webkit-backdrop-filter: var(--glass-filter);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
  padding: 0;
  gap: 4px;
  box-shadow: var(--shadow-sm);
}`);

css = css.replace(/\.letter-btn:hover\s*\{[\s\S]*?\}/, `.letter-btn:hover {
  border-color: var(--ocean-accent);
  background: rgba(14, 165, 233, 0.1);
  transform: translateY(-3px);
  box-shadow: var(--neon-glow);
}`);

// 11. Add animations to correct/wrong responses
css = css.replace(/\.country-row\.revealed\s*\{[\s\S]*?\}/, `.country-row.revealed {
  border-color: var(--success);
  background: var(--success-bg);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
}`);

css = css.replace(/\.flag-option\.correct\s*\{[\s\S]*?\}/, `.flag-option.correct {
  border-color: var(--success) !important;
  background: var(--success-bg) !important;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.4), 0 4px 16px rgba(16, 185, 129, 0.2) !important;
  transform: translateY(-2px);
}`);

css = css.replace(/\.flag-option\.wrong\s*\{[\s\S]*?\}/, `.flag-option.wrong {
  border-color: var(--error) !important;
  background: var(--error-bg) !important;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.4) !important;
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}`);

if (!css.includes('@keyframes shake')) {
  css += `\n@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}\n`;
}

// 12. Fix progress bars
css = css.replace(/background:\s*rgba\(6,\s*182,\s*212,\s*0.08\);/g, `background: rgba(255, 255, 255, 0.1);`);
css = css.replace(/background:\s*rgba\(6,\s*182,\s*212,\s*0.1\);/g, `background: rgba(255, 255, 255, 0.1);`);

fs.writeFileSync(cssPath, css);
console.log('Successfully updated style.css with dark theme and glassmorphism.');
