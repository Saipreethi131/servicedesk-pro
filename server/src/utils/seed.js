import { env } from "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import { ROLES } from "./constants.js";

// Development fixture only: this is a known, public password, never used outside local dev.
const SEED_PASSWORD = "Password@123";

const IT_SUPPORT = "IT Support";
const FACILITIES = "Facilities";
const SEED_DEPARTMENTS = [IT_SUPPORT, FACILITIES];

// departmentName is looked up after the departments are upserted; the SYSTEM_ADMIN has none (D3.9).
const SEED_USERS = [
  { firstName: "Sam", lastName: "Admin", email: "admin@servicedesk.test", role: ROLES.SYSTEM_ADMIN },
  { firstName: "Maya", lastName: "Manager", email: "manager@servicedesk.test", role: ROLES.IT_MANAGER, departmentName: IT_SUPPORT },
  { firstName: "Tom", lastName: "Technician", email: "tech@servicedesk.test", role: ROLES.TECHNICIAN, departmentName: IT_SUPPORT },
  { firstName: "Asha", lastName: "Assets", email: "assets@servicedesk.test", role: ROLES.ASSET_MANAGER, departmentName: IT_SUPPORT },
  { firstName: "Eli", lastName: "Employee", email: "employee@servicedesk.test", role: ROLES.EMPLOYEE, departmentName: IT_SUPPORT },
  // A second department, so scoping can be tried out: the manager must not see this user.
  { firstName: "Fay", lastName: "Facilities", email: "employee.facilities@servicedesk.test", role: ROLES.EMPLOYEE, departmentName: FACILITIES },
];

const seed = async () => {
  if (env.isProduction) {
    console.error("Refusing to seed: NODE_ENV is production and this script deletes data.");
    process.exit(1);
  }

  await connectDB();

  try {
    // Upsert BY NAME, so re-running never creates a second "IT Support". Departments are not cleared
    // (unlike users): later phases will reference them. $set also re-activates one that was deactivated.
    const departmentIds = new Map();
    for (const name of SEED_DEPARTMENTS) {
      const department = await Department.findOneAndUpdate(
        { name },
        { $set: { isActive: true } },
        { upsert: true, returnDocument: "after" }
      );
      departmentIds.set(name, department._id);
    }
    console.log(`Departments ready: ${SEED_DEPARTMENTS.join(", ")}`);

    const { deletedCount } = await User.deleteMany({});
    console.log(`Cleared users collection (${deletedCount} removed)`);

    // .create() runs .save(), so the pre('save') hook hashes each password.
    // insertMany() would skip the hook and store plaintext. Sequential on purpose:
    // bcrypt at cost 12 is deliberately slow, and six users is nothing.
    for (const { departmentName, ...fields } of SEED_USERS) {
      await User.create({
        ...fields,
        department: departmentName ? departmentIds.get(departmentName) : undefined,
        password: SEED_PASSWORD,
      });
    }

    // Read back from the database rather than echoing the input, to show what was actually stored.
    const users = await User.find().sort({ createdAt: 1 }).populate("department", "name");
    console.log(`\nCreated ${users.length} users:`);
    for (const u of users) {
      console.log(`  ${u.role.padEnd(14)} ${u.email.padEnd(38)} ${(u.department?.name ?? "(none)").padEnd(12)} ${u.fullName}`);
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
