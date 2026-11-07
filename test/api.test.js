// Run with: npm install && npm test
// Calls every API route in-process using a throw-away in-memory database.

const assert = require("assert");
process.env.SF_MEMORY = "1";
process.env.JWT_SECRET = "test-secret";
delete process.env.SUPABASE_URL;
process.env.SITE_URL = "https://study-flight.test";

const routes = {
  "/api/health": require("../api/health"),
  "/api/register": require("../api/register"),
  "/api/login": require("../api/login"),
  "/api/me": require("../api/me"),
  "/api/passport": require("../api/passport"),
  "/api/leaderboard": require("../api/leaderboard"),
  "/api/forgot": require("../api/forgot"),
  "/api/reset": require("../api/reset"),
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
  await check("medals and stats are saved, merged upward and cleaned", async () => {
    let r = await call("PUT", "/api/passport", { passport: { stamps: {}, st: { m_Ferry: 2, best: 4, hacked: 99, owl: "x" }, md: { first: "2026-11-01", "bad id!": "x", iron: "2026-11-02" } } }, tokenA);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.passport.st.m_Ferry, 2);
    assert.strictEqual(r.body.passport.st.hacked, undefined);
    assert.strictEqual(r.body.passport.md["bad id!"], undefined);
    r = await call("PUT", "/api/passport", { passport: { stamps: {}, st: { m_Ferry: 1, best: 9 }, md: { first: "2026-12-25" } } }, tokenA);
    assert.strictEqual(r.body.passport.st.m_Ferry, 2);
    assert.strictEqual(r.body.passport.st.best, 9);
    assert.strictEqual(r.body.passport.md.first, "2026-11-01");
    assert.strictEqual(r.body.passport.md.iron, "2026-11-02");
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
  await check("accounts can have an optional recovery email (shown masked)", async () => {
    assert.strictEqual((await call("POST", "/api/register", { username: "bad_mail", password: "password1", email: "nope" })).status, 400);
    const r = await call("POST", "/api/register", { username: "reset_me", password: "oldpass123", email: "Gaurish@Example.com" });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.user.email, "g***@example.com");
    assert.strictEqual((await call("POST", "/api/register", { username: "other_one", password: "password1", email: "gaurish@example.com" })).status, 409);
    assert.strictEqual((await call("GET", "/api/me", null, r.body.token)).body.user.email, "g***@example.com");
    assert.strictEqual((await call("GET", "/api/me", null, tokenA)).body.user.email, null);
  });
  await check("adding an email later needs the current password", async () => {
    assert.strictEqual((await call("PUT", "/api/me", { email: "me@example.org", password: "wrongpass1" }, tokenA)).status, 403);
    assert.strictEqual((await call("PUT", "/api/me", { email: "nope", password: "password1" }, tokenA)).status, 400);
    assert.strictEqual((await call("PUT", "/api/me", { email: "gaurish@example.com", password: "password1" }, tokenA)).status, 409);
    const r = await call("PUT", "/api/me", { email: "me@example.org", password: "password1" }, tokenA);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.user.email, "m***@example.org");
  });
  await check("forgot password: same answer for unknown emails, no mail sent", async () => {
    const mail = require("../api/_mail");
    const before = mail.outbox.length;
    const r = await call("POST", "/api/forgot", { email: "nobody@example.com" });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.body, { ok: true });
    assert.strictEqual(mail.outbox.length, before);
    assert.strictEqual((await call("POST", "/api/forgot", { email: "not-an-email" })).status, 400);
  });
  await check("full reset: email link, new password, old logins and old password stop working, link is single use", async () => {
    const mail = require("../api/_mail");
    const oldLogin = await call("POST", "/api/login", { username: "reset_me", password: "oldpass123" });
    const before = mail.outbox.length;
    assert.strictEqual((await call("POST", "/api/forgot", { email: "gaurish@example.com" })).status, 200);
    assert.strictEqual(mail.outbox.length, before + 1);
    const m = mail.outbox[mail.outbox.length - 1];
    assert.strictEqual(m.to, "gaurish@example.com");
    assert.ok(m.text.includes("reset_me"), "mail mentions the username");
    const token = (m.text.match(/#reset=([a-f0-9]{64})/) || [])[1];
    assert.ok(token, "mail contains a reset link");
    assert.ok(m.text.includes("https://study-flight.test/#reset="));
    // asking again straight away does not spam the inbox
    await call("POST", "/api/forgot", { email: "gaurish@example.com" });
    assert.strictEqual(mail.outbox.length, before + 1);
    // bad inputs
    assert.strictEqual((await call("POST", "/api/reset", { token, password: "short" })).status, 400);
    assert.strictEqual((await call("POST", "/api/reset", { token: "f".repeat(64), password: "brandnew123" })).status, 400);
    assert.strictEqual((await call("POST", "/api/reset", { token: "garbage", password: "brandnew123" })).status, 400);
    // the real thing
    const ok = await call("POST", "/api/reset", { token, password: "brandnew123" });
    assert.strictEqual(ok.status, 200);
    assert.ok(ok.body.token);
    assert.strictEqual((await call("GET", "/api/me", null, ok.body.token)).status, 200, "new login works");
    assert.strictEqual((await call("GET", "/api/me", null, oldLogin.body.token)).status, 401, "old logins are signed out");
    assert.strictEqual((await call("POST", "/api/login", { username: "reset_me", password: "oldpass123" })).status, 401);
    assert.strictEqual((await call("POST", "/api/login", { username: "reset_me", password: "brandnew123" })).status, 200);
    assert.strictEqual((await call("POST", "/api/reset", { token, password: "another12345" })).status, 400, "link works only once");
  });
  await check("expired reset links are refused", async () => {
    const db = require("../api/_db"), crypto = require("crypto");
    const u = await db.findByName("reset_me");
    const token = crypto.randomBytes(32).toString("hex");
    await db.setReset(u.id, crypto.createHash("sha256").update(token).digest("hex"), new Date(Date.now() - 1000).toISOString());
    assert.strictEqual((await call("POST", "/api/reset", { token, password: "brandnew456" })).status, 400);
  });
  await check("reset by email says so when the server has no mail or site address set up", async () => {
    const saved = process.env.SITE_URL; delete process.env.SITE_URL;
    const r = await call("POST", "/api/forgot", { email: "gaurish@example.com" });
    process.env.SITE_URL = saved;
    assert.strictEqual(r.status, 503);
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
