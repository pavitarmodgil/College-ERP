// ─────────────────────────────────────────────────────────────
//  scripts/migrate-passwords.js
//  One-time migration: hash all plain-text passwords in users.json
//  using bcrypt (saltRounds=12, per project convention).
//
//  Run once:  node scripts/migrate-passwords.js
//  Safe to re-run — skips already-hashed passwords.
// ─────────────────────────────────────────────────────────────

const bcrypt = require("bcrypt");
const fs     = require("fs");
const path   = require("path");

const SALT_ROUNDS = 12;
const USERS_FILE  = path.join(__dirname, "..", "users.json");

async function migrate() {
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  let changed = 0;

  for (const user of users) {
    // bcrypt hashes always start with "$2b$" — skip already-hashed passwords
    if (user.password && user.password.startsWith("$2b$")) {
      console.log(`[SKIP]  ${user.email} — already hashed`);
      continue;
    }

    const original = user.password;
    user.password  = await bcrypt.hash(original, SALT_ROUNDS);
    console.log(`[HASH]  ${user.email} (${user.role})`);
    changed++;
  }

  if (changed > 0) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    console.log(`\n✅  Migration complete. ${changed} password(s) hashed.`);
  } else {
    console.log("\n✅  Nothing to migrate — all passwords already hashed.");
  }
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
