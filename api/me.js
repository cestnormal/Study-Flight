const bcrypt = require("bcryptjs");
const db = require("./_db");
const L = require("./_lib");

module.exports = async (req, res) => {
  try {
    if (!L.allow(req, res, ["GET", "PUT", "DELETE"]) || !L.ready(res)) return;
    const user = await L.authed(req);
    if (!user) return res.status(401).json({ error: "Please log in." });
    if (req.method === "DELETE") {
      await db.remove(user.id);
      return res.json({ deleted: true });
    }
    if (req.method === "PUT") {
      // Add or change the recovery email. The current password is required so a borrowed login can't take over the account.
      if (L.throttled(req, 10, 60000, "me")) return res.status(429).json({ error: "Too many attempts. Wait a minute and try again." });
      const b = L.readBody(req);
      if (!b) return res.status(400).json({ error: "Invalid JSON" });
      const email = L.normEmail(b.email);
      if (!email) return res.status(400).json({ error: "Enter a valid email address." });
      if (typeof b.password !== "string" || !(await bcrypt.compare(b.password, user.password)))
        return res.status(403).json({ error: "That password is not correct." }); // 403, not 401, so the app does not think your login expired
      const updated = await db.setEmail(user.id, email);
      if (!updated) return res.status(409).json({ error: "That email is already used by another account." });
      return res.json({ user: L.publicUser(updated) });
    }
    res.json({ user: L.publicUser(user), totals: L.totals(user.data) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong." });
  }
};
