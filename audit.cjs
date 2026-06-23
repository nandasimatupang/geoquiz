const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, 'css/style.css'), 'utf8');

const suspiciousPatterns = [
  /#fff/i,
  /white/i,
  /#f8fafc/i,
  /#e0f7fa/i,
  /#b2ebf2/i,
  /#f0f9ff/i,
  /#fce4ec/i,
  /#fef3c7/i,
  /#c7e9f0/i,
  /#083344/i,
  /background:\s*#[a-f0-9]{3,6}/i,
  /color:\s*#[a-f0-9]{3,6}/i,
  /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*1\s*\)/i
];

const lines = css.split('\n');
console.log('--- AUDIT RESULTS ---');
lines.forEach((line, index) => {
  // Ignore lines in :root or comments
  if (line.includes('--') && line.includes(':')) return;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(line) && !line.includes('var(') && !line.includes('linear-gradient') && !line.includes('box-shadow')) {
      console.log(`Line ${index + 1}: ${line.trim()}`);
      break;
    }
  }
});
