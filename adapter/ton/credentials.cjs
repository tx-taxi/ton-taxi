"use strict";
const fs = require("node:fs");

// Server-only configuration; never include this value in health or snapshots.
function tonApiKey() {
  const direct = process.env.TON_API_KEY?.trim();
  if (direct) return direct;
  const filename = process.env.TON_API_KEY_FILE;
  if (!filename) return "";
  try {
    if (fs.statSync(filename).size > 8192) throw new Error();
    return fs.readFileSync(filename, "utf8").trim();
  } catch {
    // Pending access is optional; an unreadable secret must not stop blocks.
    return "";
  }
}
module.exports = {tonApiKey};
