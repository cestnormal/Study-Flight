const crypto = require("crypto");
const db = require("./_db");
const mail = require("./_mail");
const L = require("./_lib");

const RESET_MS = 60 * 60 * 1000; // a reset link works for one hour

module.exports = async (req, res) => {
  try {
    if (!L.allow(req, res, ["POST"]) || !L.ready(res)) return;
    if (!mail.configured() || !L.siteUrl())
      return res.status(503).json({ error: "Password reset by email is not set up on this server yet." });
    if (L.throttled(req, 5, 60000, "forgot")) return res.status(429).json({ error: "Too many attempts. Wait a minute and try again." });
    const b = L.readBody(req);
    if (!b) return res.status(400).json({ error: "Invalid JSON" });
    const email = L.normEmail(b.email);
    if (!email) return res.status(400).json({ error: "Enter a valid email address." });

    // The answer is always the same, so nobody can use this to find out which emails have accounts.
    const user = await db.findByEmail(email);
    const justSent = user && user.reset_exp && new Date(user.reset_exp).getTime() - Date.now() > RESET_MS - 60000;
    if (user && !justSent) {
      try {
        const token = crypto.randomBytes(32).toString("hex");
        await db.setReset(user.id, crypto.createHash("sha256").update(token).digest("hex"), new Date(Date.now() + RESET_MS).toISOString());
        await mail.send({
          to: email,
          subject: "Reset your Study Flight password",
          text: `Hi ${user.username},\n\nSomeone asked to reset the password for your Study Flight account. Open this link to choose a new one (it works for 1 hour):\n\n${L.siteUrl()}/#reset=${token}\n\nYour username is: ${user.username}\n\nIf this wasn't you, ignore this email. Your password stays the same.`,
        });
      } catch (e) {
        console.error("reset email failed", e);
      }
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong." });
  }
};
