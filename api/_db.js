// Database layer. Production uses Supabase. For local tests only, set SF_MEMORY=1
// to use a throw-away in-memory store instead.
const memory = new Map();
let client = null;

const useMemory = () => !process.env.SUPABASE_URL && process.env.SF_MEMORY === "1";

function configured() {
  if (!process.env.JWT_SECRET) return false;
  return useMemory() || !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function sb() {
  if (!client) {
    const { createClient } = require("@supabase/supabase-js");
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  }
  return client;
}

const COLS = "id, username, password, email, reset_hash, reset_exp, pw_at, data, countries, trips, minutes";

async function findByName(username) {
  if (useMemory()) return [...memory.values()].find((u) => u.username === username) || null;
  const { data, error } = await sb().from("users").select(COLS).eq("username", username).maybeSingle();
  if (error) throw error;
  return data;
}

async function findById(id) {
  if (useMemory()) return memory.get(id) || null;
  const { data, error } = await sb().from("users").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function findByEmail(email) {
  if (useMemory()) return [...memory.values()].find((u) => u.email === email) || null;
  const { data, error } = await sb().from("users").select(COLS).eq("email", email).maybeSingle();
  if (error) throw error;
  return data;
}

// Returns { user } or { dup: "username" | "email" } when one of them is already taken.
async function create(username, password, email) {
  if (useMemory()) {
    if (await findByName(username)) return { dup: "username" };
    if (email && (await findByEmail(email))) return { dup: "email" };
    const u = { id: require("crypto").randomUUID(), username, password, email: email || null, reset_hash: null, reset_exp: null, pw_at: null, data: {}, countries: 0, trips: 0, minutes: 0 };
    memory.set(u.id, u);
    return { user: u };
  }
  const row = { username, password };
  if (email) row.email = email;
  const { data, error } = await sb().from("users").insert(row).select(COLS).single();
  if (error) {
    if (error.code === "23505") return { dup: /email/i.test(`${error.message} ${error.details}`) ? "email" : "username" };
    throw error;
  }
  return { user: data };
}

// Returns the updated user, or null if another account already uses that email.
async function setEmail(id, email) {
  if (useMemory()) {
    const other = await findByEmail(email);
    if (other && other.id !== id) return null;
    return Object.assign(memory.get(id), { email });
  }
  const { data, error } = await sb().from("users").update({ email }).eq("id", id).select(COLS).single();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return data;
}

// Only a hash of the reset token is stored, so a leaked database cannot be used to reset passwords.
async function setReset(id, hash, exp) {
  if (useMemory()) return Object.assign(memory.get(id), { reset_hash: hash, reset_exp: exp });
  const { error } = await sb().from("users").update({ reset_hash: hash, reset_exp: exp }).eq("id", id);
  if (error) throw error;
}

async function findByResetHash(hash) {
  if (useMemory()) {
    const u = [...memory.values()].find((x) => x.reset_hash === hash);
    return u && new Date(u.reset_exp).getTime() > Date.now() ? u : null;
  }
  const { data, error } = await sb().from("users").select(COLS).eq("reset_hash", hash).gt("reset_exp", new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return data;
}

// New password: clears the reset link and stamps pw_at, which signs out every older login.
async function setPassword(id, password) {
  const row = { password, reset_hash: null, reset_exp: null, pw_at: new Date().toISOString() };
  if (useMemory()) return Object.assign(memory.get(id), row);
  const { data, error } = await sb().from("users").update(row).eq("id", id).select(COLS).single();
  if (error) throw error;
  return data;
}

async function saveData(id, data, t) {
  const row = { data, countries: t.countries, trips: t.trips, minutes: t.minutes };
  if (useMemory()) return Object.assign(memory.get(id), row);
  const { error } = await sb().from("users").update(row).eq("id", id);
  if (error) throw error;
}

async function remove(id) {
  if (useMemory()) return memory.delete(id);
  const { error } = await sb().from("users").delete().eq("id", id);
  if (error) throw error;
}

async function top(n) {
  if (useMemory()) {
    return [...memory.values()].sort((a, b) => b.minutes - a.minutes).slice(0, n)
      .map((u) => ({ username: u.username, minutes: u.minutes, countries: u.countries, trips: u.trips }));
  }
  const { data, error } = await sb().from("users").select("username, minutes, countries, trips")
    .gt("minutes", 0).order("minutes", { ascending: false }).limit(n);
  if (error) throw error;
  return data;
}

module.exports = { configured, findByName, findById, findByEmail, create, setEmail, setReset, findByResetHash, setPassword, saveData, remove, top };
