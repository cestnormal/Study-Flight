const db = require("./_db");
const L = require("./_lib");

module.exports = async (req, res) => {
  try {
    if (!L.allow(req, res, ["GET", "PUT"]) || !L.ready(res)) return;
    const user = await L.authed(req);
    if (!user) return res.status(401).json({ error: "Please log in." });
    const stored = L.clean(user.data);

    if (req.method === "GET") return res.json({ passport: stored, totals: L.totals(stored) });

    const b = L.readBody(req);
    if (!b) return res.status(400).json({ error: "Invalid JSON" });
    if (!b.passport || typeof b.passport !== "object") return res.status(400).json({ error: "Send { passport: {...} }" });
    const merged = L.merge(stored, L.clean(b.passport));
    const t = L.totals(merged);
    await db.saveData(user.id, merged, t);
    res.json({ passport: merged, totals: t });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong." });
  }
};
