const REQUIRED_KEYS = ["NODE_ENV", "PORT", "CLIENT_URL", "MONGO_URI"];
const VALID_NODE_ENVS = ["development", "production", "test"];

// Report every problem at once instead of making the developer fix them one restart at a time.
const missing = REQUIRED_KEYS.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error(`\nMissing required environment variables: ${missing.join(", ")}`);
  console.error("Copy server/.env.example to server/.env and fill in the values.\n");
  process.exit(1);
}

if (!VALID_NODE_ENVS.includes(process.env.NODE_ENV)) {
  console.error(
    `\nInvalid NODE_ENV "${process.env.NODE_ENV}". Expected one of: ${VALID_NODE_ENVS.join(", ")}\n`
  );
  process.exit(1);
}

// Environment variables are always strings; Number("abc") is NaN, so check before trusting it.
const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`\nInvalid PORT "${process.env.PORT}". Expected an integer between 1 and 65535.\n`);
  process.exit(1);
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  port,
  clientUrl: process.env.CLIENT_URL,
  mongoUri: process.env.MONGO_URI,
});
