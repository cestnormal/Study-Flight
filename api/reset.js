const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./_db");
const L = require("./_lib");

module.exports = async (req, res) => {
  try {
    if (!L.allow(req, res, ["POST"]) || !L.ready(res)) return;
    if (L.throttled(req, 10, 60000, "reset")) return res.status(429).json({ error: "Too many attempts. Wait a minute and try again." });
    const b = L.readBody(req);
    if (!b) return res.status(400).json({ error: "Invalid JSON" });
    const { token, password } = b;
    if (typeof password !== "string" || password.length < 8 || password.length > 72)
      return res.status(400).json({ error: "Password must be 8 to 72 characters." });
    const bad = { error: "This reset link is invalid or has expired. Ask for a new one." };
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json(bad);
    const user = await db.findByResetHash(crypto.createHash("sha256").update(token).digest("hex"));
    if (!user) return res.status(400).json(bad);
    const updated = await db.setPassword(user.id, await bcrypt.hash(password, 10)); // also makes the link single-use
    res.json({ token: L.sign(updated), user: L.publicUser(updated) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong." });
  }
};
