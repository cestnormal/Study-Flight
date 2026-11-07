// Shared helpers for all API routes. Files starting with "_" are not exposed as routes.
const jwt = require("jsonwebtoken");
const db = require("./_db");

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
const MEDAL_ID = /^[a-z0-9_]{1,24}$/;
const ST_KEYS = ["m_Flight", "m_Train", "m_Bus", "m_Car", "m_Ferry", "m_Bike", "owl", "lark", "best", "long", "iron", "turb", "dbest"];

function readBody(req) {
  try {
    const b = req.body;
    if (b && typeof b === "object") return b;
    if (typeof b === "string" && b) return JSON.parse(b);
    return {};
  } catch (e) {
    return null;
  }
}

function allow(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader && res.setHeader("Allow", methods.join(", "));
  res.status(405).json({ error: "Method not allowed" });
  return false;
}

function ready(res) {
  if (db.configured()) return true;
  res.status(503).json({ error: "Accounts are not set up on this server yet." });
  return false;
}

function sign(user) {
  return jwt.sign({ sub: user.id, u: user.username }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

async function authed(req) {
  const h = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!h || !h.startsWith("Bearer ")) return null;
  try {
    const p = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    return await db.findById(p.sub);
  } catch (e) {
    return null;
  }
}

// Small per-instance throttle against password guessing. Not a full defence on
// serverless (each instance has its own memory) but it stops casual abuse.
const hits = new Map();
function throttled(req, max = 10, windowMs = 60000) {
  const ip = String((req.headers && req.headers["x-forwarded-for"]) || "local").split(",")[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

// ---- passport data: never trust what the browser sends ----
const num = (v, max) => {
  v = Number(v);
  return Number.isFinite(v) ? Math.min(Math.max(Math.round(v), 0), max) : 0;
};
const str = (v, max) => (typeof v === "string" ? [...v.trim()].slice(0, max).join("") : "");

function clean(p) {
  const out = { stamps: {}, friends: {}, dly: 0, tdl: 0 };
  const st = p && typeof p.stamps === "object" && p.stamps ? p.stamps : {};
  for (const k of Object.keys(st).slice(0, 300)) {
    const name = str(k, 60);
    if (!name) continue;
    const s = st[k] && typeof st[k] === "object" ? st[k] : {};
    out.stamps[name] = {
      n: num(s.n, 100000),
      min: num(s.min, 10000000),
      f: typeof s.f === "string" ? [...s.f].slice(0, 8).join("") : "",
      last: typeof s.last === "string" ? s.last.slice(0, 40) : "",
    };
  }
  const fr = p && typeof p.friends === "object" && p.friends ? p.friends : {};
  for (const k of Object.keys(fr).slice(0, 300)) {
    const name = str(k, 60);
    if (name) out.friends[name] = str(fr[k], 40); // "" means "remove this friend"
  }
  out.dly = num(p && p.dly, 100000);
  out.tdl = num(p && p.tdl, 10000000);
  // medal progress: only known counters are kept, and medals are just id -> date earned
  out.st = {};
  const stats = p && typeof p.st === "object" && p.st ? p.st : {};
  for (const k of ST_KEYS) if (k in stats) out.st[k] = num(stats[k], 10000000);
  out.md = {};
  const md = p && typeof p.md === "object" && p.md ? p.md : {};
  for (const k of Object.keys(md).slice(0, 80)) if (MEDAL_ID.test(k) && typeof md[k] === "string") out.md[k] = md[k].slice(0, 10);
  return out;
}

// Stamps only ever grow: keep the larger numbers so a stale device can't erase progress.
function merge(old, inc) {
  const out = { stamps: {}, friends: {}, dly: Math.max(old.dly || 0, inc.dly || 0), tdl: Math.max(old.tdl || 0, inc.tdl || 0) };
  const names = new Set([...Object.keys(old.stamps || {}), ...Object.keys(inc.stamps || {})]);
  for (const c of names) {
    const a = (old.stamps || {})[c], b = (inc.stamps || {})[c];
    if (!a) out.stamps[c] = b;
    else if (!b) out.stamps[c] = a;
    else {
      const win = b.n >= a.n ? b : a;
      out.stamps[c] = { n: Math.max(a.n, b.n), min: Math.max(a.min, b.min), f: win.f || a.f || b.f, last: win.last || a.last || b.last };
    }
  }
  const fr = { ...(old.friends || {}), ...(inc.friends || {}) };
  for (const k of Object.keys(fr)) if (fr[k]) out.friends[k] = fr[k];
  // counters only go up; a medal keeps the earliest date it was earned
  out.st = {};
  for (const k of ST_KEYS) {
    const v = Math.max((old.st || {})[k] || 0, (inc.st || {})[k] || 0);
    if (v) out.st[k] = v;
  }
  out.md = { ...(old.md || {}) };
  for (const k of Object.keys(inc.md || {})) if (!out.md[k] || inc.md[k] < out.md[k]) out.md[k] = inc.md[k];
  return out;
}

function totals(data) {
  const v = Object.values((data && data.stamps) || {});
  return { countries: v.length, trips: v.reduce((a, s) => a + s.n, 0), minutes: v.reduce((a, s) => a + s.min, 0) };
}

module.exports = { USERNAME, readBody, allow, ready, sign, authed, throttled, clean, merge, totals };
