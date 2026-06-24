const $ = (id) => document.getElementById(id);

function showToast() {}

function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, ' ')
    .replace(/[^a-zA-Z\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export { $, showToast, normalize, shuffle, escapeAttr };
