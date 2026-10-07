import { connectDB, disconnectDB } from "../config/db.js";
import Category from "../models/Category.js";

// Same collation as the model's own unique index (D5.4): compares names ignoring case (not accents), so this
// script's idea of "already exists" matches what the database would actually reject as a duplicate.
const COLLATION = { locale: "en", strength: 2 };

const CATEGORY_TREE = [
  { name: "Hardware", children: ["Laptop", "Desktop", "Printer", "Peripherals"] },
  { name: "Software", children: ["Installation", "License", "Application error"] },
  { name: "Network", children: ["Wi-Fi", "VPN", "Connectivity"] },
  { name: "Accounts & Access", children: ["Password reset", "Permissions", "New account"] },
  { name: "Other", children: [] },
];

let created = 0;
let skipped = 0;

// Idempotent by design: looks up (parent, name) case-insensitively before creating, and never touches anything
// it finds - no rename, no reactivate, no delete. Safe to run against a database that already has categories,
// including ones a SYSTEM_ADMIN has since edited through the UI.
const ensureCategory = async (name, parent) => {
  const existing = await Category.findOne({ parent, name }).collation(COLLATION);
  if (existing) {
    skipped++;
    console.log(`  skip:   "${name}" already exists`);
    return existing;
  }
  const category = await Category.create({ name, parent });
  created++;
  console.log(`  create: "${name}"`);
  return category;
};

const main = async () => {
  await connectDB();

  for (const top of CATEGORY_TREE) {
    const parentDoc = await ensureCategory(top.name, null);
    for (const childName of top.children) {
      await ensureCategory(childName, parentDoc._id);
    }
  }

  console.log(`\nCreated: ${created}`);
  console.log(`Skipped (already existed): ${skipped}`);
};

let exitCode = 0;
try {
  await main();
} catch (err) {
  exitCode = 1;
  console.error(`\nseed-categories failed: ${err.message}`);
} finally {
  await disconnectDB();
  process.exit(exitCode);
}
