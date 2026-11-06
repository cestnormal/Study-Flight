const bcrypt = require("bcryptjs");
const db = require("./_db");
const L = require("./_lib");

module.exports = async (req, res) => {
  try {
    if (!L.allow(req, res, ["POST"]) || !L.ready(res)) return;
    if (L.throttled(req)) return res.status(429).json({ error: "Too many attempts. Wait a minute and try again." });
    const b = L.readBody(req);
    if (!b) return res.status(400).json({ error: "Invalid JSON" });
    const { username, password } = b;
    if (typeof username !== "string" || !L.USERNAME.test(username))
      return res.status(400).json({ error: "Username must be 3 to 20 letters, numbers or underscores." });
    if (typeof password !== "string" || password.length < 8 || password.length > 72)
      return res.status(400).json({ error: "Password must be 8 to 72 characters." });
    const user = await db.create(username.toLowerCase(), await bcrypt.hash(password, 10));
    if (!user) return res.status(409).json({ error: "That username is taken." });
    res.status(201).json({ token: L.sign(user), user: { username: user.username } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong." });
  }
};
