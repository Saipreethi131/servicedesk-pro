import { parseArgs } from "node:util";
import readline from "node:readline";
import { Writable } from "node:stream";
import { env } from "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import User from "../models/User.js";
import { ROLES } from "./constants.js";

// Same rule as changePassword in auth.service.js. Minimum is in characters (the model's minlength),
// maximum in bytes (bcrypt ignores everything past 72).
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

const USAGE = [
  "Usage: npm run create-admin -- --email <email> --firstName <name> --lastName <name>",
  "Password: set CREATE_ADMIN_PASSWORD, or you will be prompted (input is hidden).",
].join("\n");

// An expected failure whose message is meant for the person running the script.
class CliError extends Error {}

const parseCliArgs = () => {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        email: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
      },
    }));
  } catch (err) {
    throw new CliError(`${err.message}\n${USAGE}`);
  }
  const { email, firstName, lastName } = values;
  if (![email, firstName, lastName].every((v) => v?.trim())) {
    throw new CliError(`--email, --firstName and --lastName are all required.\n${USAGE}`);
  }
  return { email, firstName, lastName };
};

// Reads lines with the terminal echo swallowed, so the password never appears on screen.
// One interface for every prompt: closing and reopening one per prompt can drop already-buffered input.
const createHiddenReader = (input = process.stdin, output = process.stdout) => {
  const muted = new Writable({ write: (chunk, encoding, done) => done() }); // discards the echo
  const rl = readline.createInterface({ input, output: muted, terminal: true });
  const lines = [];
  const waiting = [];
  let closed = false;

  rl.on("line", (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
  // Ctrl+C or end of input: give every pending prompt a null so the script fails cleanly and still disconnects.
  rl.on("SIGINT", () => rl.close());
  rl.on("close", () => {
    closed = true;
    waiting.splice(0).forEach((resolve) => resolve(null));
  });

  return {
    ask: (question) => {
      output.write(question);
      return new Promise((resolve) => {
        if (lines.length) resolve(lines.shift());
        else if (closed) resolve(null);
        else waiting.push(resolve);
      }).then((answer) => {
        output.write("\n"); // the Enter key wasn't echoed, so move to the next line ourselves
        return answer;
      });
    },
    close: () => rl.close(),
  };
};

const resolvePassword = async () => {
  if (env.createAdminPassword) return env.createAdminPassword;

  const reader = createHiddenReader();
  try {
    const password = await reader.ask("Admin password: ");
    const confirm = await reader.ask("Confirm password: ");
    if (password === null || confirm === null) {
      throw new CliError(
        "No password provided. Set CREATE_ADMIN_PASSWORD, or run this in an interactive terminal."
      );
    }
    // The only admin has no one to reset their password, so a typo here would lock everyone out.
    if (password !== confirm) throw new CliError("Passwords do not match.");
    return password;
  } finally {
    reader.close();
  }
};

const validatePassword = (password) => {
  if (password.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw new CliError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters and at most ${MAX_PASSWORD_BYTES} bytes.`
    );
  }
};

const main = async () => {
  const { email, firstName, lastName } = parseCliArgs(); // fail on bad arguments before touching the database
  await connectDB();

  // Any SYSTEM_ADMIN counts, active or not: a deactivated admin can be reactivated, and this
  // script must never become a second way to mint administrators.
  if (await User.exists({ role: ROLES.SYSTEM_ADMIN })) {
    throw new CliError("A SYSTEM_ADMIN already exists. Refusing to create another.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  // Checked explicitly: with autoIndex off in production, the unique index may not exist yet to catch this.
  if (await User.exists({ email: normalizedEmail })) {
    throw new CliError(`A user with the email ${normalizedEmail} already exists.`);
  }

  const password = await resolvePassword();
  validatePassword(password);

  // .create() runs the pre('save') hook, which hashes the password.
  const admin = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    password,
    role: ROLES.SYSTEM_ADMIN,
  });
  console.log(`Created SYSTEM_ADMIN ${admin.email} (id ${admin._id}).`);
};

let exitCode = 0;
try {
  await main();
} catch (err) {
  exitCode = 1;
  if (err instanceof CliError) {
    console.error(`\n${err.message}`);
  } else if (err.name === "ValidationError") {
    console.error(`\nInvalid input: ${Object.values(err.errors).map((e) => e.message).join("; ")}`);
  } else {
    console.error(`\ncreate-admin failed: ${err.message}`);
  }
} finally {
  await disconnectDB();
  process.exit(exitCode);
}
