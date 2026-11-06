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

const COLS = "id, username, password, data, countries, trips, minutes";

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

// Returns the new user, or null if the username is already taken.
async function create(username, password) {
  if (useMemory()) {
    if (await findByName(username)) return null;
    const u = { id: require("crypto").randomUUID(), username, password, data: {}, countries: 0, trips: 0, minutes: 0 };
    memory.set(u.id, u);
    return u;
  }
  const { data, error } = await sb().from("users").insert({ username, password }).select(COLS).single();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
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

module.exports = { configured, findByName, findById, create, saveData, remove, top };
