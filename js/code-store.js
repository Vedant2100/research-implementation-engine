const CODE_KEY   = 'research_engine_code';
const STATUS_KEY  = 'research_engine_status';

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function getCode(title) {
  try { return (JSON.parse(localStorage.getItem(CODE_KEY) || '{}'))[slug(title)] || ''; }
  catch { return ''; }
}

export function saveCode(title, code) {
  try {
    const s = JSON.parse(localStorage.getItem(CODE_KEY) || '{}');
    s[slug(title)] = code;
    localStorage.setItem(CODE_KEY, JSON.stringify(s));
  } catch {}
}

export function getStatus(title) {
  try { return (JSON.parse(localStorage.getItem(STATUS_KEY) || '{}'))[slug(title)] || 'todo'; }
  catch { return 'todo'; }
}

export function setStatus(title, status) {
  try {
    const s = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}');
    s[slug(title)] = status;
    localStorage.setItem(STATUS_KEY, JSON.stringify(s));
  } catch {}
}
