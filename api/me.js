const db = require("./_db");
const L = require("./_lib");

module.exports = async (req, res) => {
  try {
    if (!L.allow(req, res, ["GET", "DELETE"]) || !L.ready(res)) return;
    const user = await L.authed(req);
    if (!user) return res.status(401).json({ error: "Please log in." });
    if (req.method === "DELETE") {
      await db.remove(user.id);
      return res.json({ deleted: true });
    }
    res.json({ user: { username: user.username }, totals: L.totals(user.data) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong." });
  }
};
