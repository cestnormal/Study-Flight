const bcrypt = require("bcryptjs");
const db = require("./_db");
const L = require("./_lib");

const DUMMY = bcrypt.hashSync("not-a-real-password", 10); // keeps timing similar for unknown users

module.exports = async (req, res) => {
  try {
    if (!L.allow(req, res, ["POST"]) || !L.ready(res)) return;
    if (L.throttled(req)) return res.status(429).json({ error: "Too many attempts. Wait a minute and try again." });
    const b = L.readBody(req);
    if (!b) return res.status(400).json({ error: "Invalid JSON" });
    const { username, password } = b;
    if (typeof username !== "string" || typeof password !== "string")
      return res.status(400).json({ error: "Enter a username and password." });
    const user = await db.findByName(username.toLowerCase());
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY);
    if (!user || !ok) return res.status(401).json({ error: "Wrong username or password." });
    res.json({ token: L.sign(user), user: L.publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong." });
  }
};
