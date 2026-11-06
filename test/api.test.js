// Run with: npm install && npm test
// Calls every API route in-process using a throw-away in-memory database.

const assert = require("assert");
process.env.SF_MEMORY = "1";
process.env.JWT_SECRET = "test-secret";
delete process.env.SUPABASE_URL;

const routes = {
  "/api/health": require("../api/health"),
  "/api/register": require("../api/register"),
  "/api/login": require("../api/login"),
  "/api/me": require("../api/me"),
  "/api/passport": require("../api/passport"),
  "/api/leaderboard": require("../api/leaderboard"),
};

let ip = 0;
function call(method, url, body, token) {
  return new Promise((resolve) => {
    const handler = routes[url];
    if (!handler) return resolve({ status: 404, body: { error: "not found" } });
    const req = { method, body, headers: { "x-forwarded-for": "test-" + ++ip } };
    if (token) req.headers.authorization = "Bearer " + token;
    const res = {
      code: 200,
      setHeader() {},
      status(c) { this.code = c; return this; },
      json(b) { resolve({ status: this.code, body: b }); },
    };
    handler(req, res);
  });
}

let passed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log("  ok  " + name); }
  catch (e) { console.error("FAIL  " + name + "\n      " + e.message); process.exitCode = 1; }
}

(async () => {
  let tokenA, tokenB;
  await check("health", async () => assert.strictEqual((await call("GET", "/api/health")).body.accounts, true));
  await check("register rejects bad username", async () =>
    assert.strictEqual((await call("POST", "/api/register", { username: "a!", password: "password1" })).status, 400));
  await check("register rejects short password", async () =>
    assert.strictEqual((await call("POST", "/api/register", { username: "gaurish", password: "short" })).status, 400));
  await check("register works", async () => {
    const r = await call("POST", "/api/register", { username: "gaurish", password: "password1" });
    assert.strictEqual(r.status, 201); tokenA = r.body.token; assert.ok(tokenA);
  });
  await check("duplicate username (any case) is rejected", async () =>
    assert.strictEqual((await call("POST", "/api/register", { username: "GAURISH", password: "password1" })).status, 409));
  await check("login works / wrong password fails", async () => {
    assert.strictEqual((await call("POST", "/api/login", { username: "Gaurish", password: "password1" })).status, 200);
    assert.strictEqual((await call("POST", "/api/login", { username: "gaurish", password: "wrongpass1" })).status, 401);
    assert.strictEqual((await call("POST", "/api/login", { username: "nobody", password: "password1" })).status, 401);
  });
  await check("protected routes need a token", async () => {
    assert.strictEqual((await call("GET", "/api/passport")).status, 401);
    assert.strictEqual((await call("GET", "/api/me", null, "garbage")).status, 401);
  });
  await check("new account has an empty passport", async () => {
    const r = await call("GET", "/api/passport", null, tokenA);
    assert.deepStrictEqual(r.body.passport.stamps, {});
    assert.strictEqual(r.body.totals.minutes, 0);
  });
  await check("saving a passport works and totals add up", async () => {
    const r = await call("PUT", "/api/passport", { passport: {
      stamps: { Japan: { n: 2, min: 1440, f: "🇯🇵", last: "2026-11-06" }, UAE: { n: 1, min: 405, f: "🇦🇪", last: "2026-11-05" } },
      friends: { Japan: "Aiko" }, dly: 1, tdl: 10 } }, tokenA);
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.body.totals, { countries: 2, trips: 3, minutes: 1845 });
  });
  await check("merge keeps larger numbers and never loses stamps", async () => {
    const r = await call("PUT", "/api/passport", { passport: {
      stamps: { Japan: { n: 1, min: 720, f: "🇯🇵", last: "2026-01-01" }, India: { n: 1, min: 510, f: "🇮🇳", last: "2026-11-06" } },
      friends: { Japan: "Aiko", India: "Ravi" } } }, tokenA);
    assert.strictEqual(r.body.passport.stamps.Japan.n, 2);
    assert.strictEqual(r.body.passport.stamps.Japan.min, 1440);
    assert.ok(r.body.passport.stamps.UAE && r.body.passport.stamps.India);
    assert.strictEqual(r.body.passport.friends.India, "Ravi");
  });
  await check("a friend can be removed by sending a blank name", async () => {
    const r = await call("PUT", "/api/passport", { passport: { stamps: {}, friends: { India: "  " } } }, tokenA);
    assert.strictEqual(r.body.passport.friends.India, undefined);
    assert.strictEqual(r.body.passport.friends.Japan, "Aiko");
  });
  await check("bad or hostile data is cleaned", async () => {
    const r = await call("PUT", "/api/passport", { passport: { stamps: { X: { n: -5, min: "abc", f: "x".repeat(50), last: 123 } }, friends: { X: "   " }, dly: "1e99" } }, tokenA);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.passport.stamps.X.n, 0);
    assert.strictEqual(r.body.passport.stamps.X.f.length, 8);
    assert.strictEqual(r.body.passport.friends.X, undefined);
    assert.strictEqual((await call("PUT", "/api/passport", { nope: 1 }, tokenA)).status, 400);
  });
  await check("passports are private per user", async () => {
    tokenB = (await call("POST", "/api/register", { username: "friend_b", password: "password2" })).body.token;
    assert.deepStrictEqual((await call("GET", "/api/passport", null, tokenB)).body.passport.stamps, {});
  });
  await check("leaderboard is public, sorted and leaks nothing private", async () => {
    await call("PUT", "/api/passport", { passport: { stamps: { Italy: { n: 1, min: 100, f: "🇮🇹", last: "" } } } }, tokenB);
    const r = await call("GET", "/api/leaderboard");
    assert.strictEqual(r.body.leaderboard[0].username, "gaurish");
    assert.strictEqual(r.body.leaderboard[1].username, "friend_b");
    assert.deepStrictEqual(Object.keys(r.body.leaderboard[0]).sort(), ["countries", "minutes", "trips", "username"]);
  });
  await check("wrong HTTP method is rejected", async () =>
    assert.strictEqual((await call("GET", "/api/register")).status, 405));
  await check("too many login attempts are throttled", async () => {
    const req = { method: "POST", body: { username: "gaurish", password: "nopenope1" }, headers: { "x-forwarded-for": "brute" } };
    let last;
    for (let i = 0; i < 12; i++) last = await new Promise((resolve) => {
      routes["/api/login"](req, { setHeader() {}, status(c) { this.c = c; return this; }, json() { resolve(this.c); } });
    });
    assert.strictEqual(last, 429);
  });
  await check("server says so when it is not configured", async () => {
    const saved = process.env.JWT_SECRET; delete process.env.JWT_SECRET;
    const r = await call("POST", "/api/login", { username: "gaurish", password: "password1" });
    process.env.JWT_SECRET = saved;
    assert.strictEqual(r.status, 503);
  });
  await check("deleting an account removes its data", async () => {
    assert.strictEqual((await call("DELETE", "/api/me", null, tokenB)).status, 200);
    assert.strictEqual((await call("GET", "/api/me", null, tokenB)).status, 401);
    assert.ok(!(await call("GET", "/api/leaderboard")).body.leaderboard.some((x) => x.username === "friend_b"));
  });
  console.log(`\n${passed} checks passed${process.exitCode ? ", some FAILED" : ""}`);
})();
