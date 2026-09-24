import { connectDB, disconnectDB } from "../config/db.js";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import Department from "../models/Department.js";

// Production runs with autoIndex off (config/db.js), so this script is how its indexes get built.
// Nothing discovers models automatically: add every new model here.
const MODELS = [User, RefreshToken, Department];

const syncModel = async (Model) => {
  // Outside production Mongoose is already building these indexes in the background; wait for that
  // to finish so the two can't race each other.
  await Model.init();
  // Creates the missing indexes AND drops any index in the database that the schema doesn't declare.
  // Resolves to the names it dropped.
  const dropped = await Model.syncIndexes();
  const indexes = await Model.listIndexes(); // read back what the database actually has now
  return { dropped: Array.isArray(dropped) ? dropped : [], names: indexes.map((index) => index.name) };
};

const main = async () => {
  await connectDB();

  // One model failing (say, duplicate emails blocking the unique index) must not hide the others' results.
  const failed = [];
  for (const Model of MODELS) {
    const label = `${Model.modelName} (${Model.collection.name})`;
    try {
      const { dropped, names } = await syncModel(Model);
      console.log(`${label}: ${names.join(", ")}`);
      if (dropped.length) console.log(`  dropped, not in schema: ${dropped.join(", ")}`);
    } catch (err) {
      failed.push(Model.modelName);
      console.error(`${label}: FAILED - ${err.message}`);
    }
  }

  if (failed.length) throw new Error(`${failed.length} of ${MODELS.length} models failed: ${failed.join(", ")}`);
  console.log("\nIndexes are in sync with the schemas.");
};

let exitCode = 0;
try {
  await main();
} catch (err) {
  exitCode = 1;
  console.error(`\nsync-indexes failed: ${err.message}`);
} finally {
  await disconnectDB();
  process.exit(exitCode);
}
