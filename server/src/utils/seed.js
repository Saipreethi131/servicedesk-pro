import { env } from "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import User from "../models/User.js";
import { ROLES } from "./constants.js";

// Development fixture only: this is a known, public password, never used outside local dev.
const SEED_PASSWORD = "Password@123";

const SEED_USERS = [
  { firstName: "Sam", lastName: "Admin", email: "admin@servicedesk.test", role: ROLES.SYSTEM_ADMIN },
  { firstName: "Maya", lastName: "Manager", email: "manager@servicedesk.test", role: ROLES.IT_MANAGER },
  { firstName: "Tom", lastName: "Technician", email: "tech@servicedesk.test", role: ROLES.TECHNICIAN },
  { firstName: "Asha", lastName: "Assets", email: "assets@servicedesk.test", role: ROLES.ASSET_MANAGER },
  { firstName: "Eli", lastName: "Employee", email: "employee@servicedesk.test", role: ROLES.EMPLOYEE },
];

const seed = async () => {
  if (env.isProduction) {
    console.error("Refusing to seed: NODE_ENV is production and this script deletes data.");
    process.exit(1);
  }

  await connectDB();

  try {
    const { deletedCount } = await User.deleteMany({});
    console.log(`Cleared users collection (${deletedCount} removed)`);

    // .create() runs .save(), so the pre('save') hook hashes each password.
    // insertMany() would skip the hook and store plaintext. Sequential on purpose:
    // bcrypt at cost 12 is deliberately slow, and five users is nothing.
    for (const data of SEED_USERS) {
      await User.create({ ...data, password: SEED_PASSWORD });
    }

    // Read back from the database rather than echoing the input, to show what was actually stored.
    const users = await User.find().sort({ createdAt: 1 });
    console.log(`\nCreated ${users.length} users:`);
    for (const u of users) {
      console.log(`  ${u.role.padEnd(14)} ${u.email.padEnd(28)} ${u.fullName}`);
    }
    console.log("\nAll seeded users share the password defined in seed.js.");
  } finally {
    await disconnectDB();
  }
};

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  });
