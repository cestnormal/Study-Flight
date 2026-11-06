const db = require("./_db");

module.exports = (req, res) => res.json({ ok: true, accounts: db.configured() });
