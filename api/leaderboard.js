const db = require("./_db");
const L = require("./_lib");

module.exports = async (req, res) => {
  try {
    if (!L.allow(req, res, ["GET"]) || !L.ready(res)) return;
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.json({ leaderboard: await db.top(10) }); // usernames and totals only, never passwords or passports
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong." });
  }
};
