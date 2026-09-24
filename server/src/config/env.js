const REQUIRED_KEYS = ["NODE_ENV", "PORT", "CLIENT_URL", "MONGO_URI", "JWT_ACCESS_SECRET", "CLIENT_ORIGIN"];
const MIN_JWT_SECRET_LENGTH = 32; // HS256 is only as strong as its key; short secrets can be brute-forced offline
const TTL_PATTERN = /^\d+[smhd]$/; // the subset of jsonwebtoken's expiresIn formats we accept, e.g. "15m"
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

// Report the length only, never the secret itself.
if (process.env.JWT_ACCESS_SECRET.length < MIN_JWT_SECRET_LENGTH) {
  console.error(
    `\nJWT_ACCESS_SECRET is too short (${process.env.JWT_ACCESS_SECRET.length} characters). ` +
      `It must be at least ${MIN_JWT_SECRET_LENGTH}.\n`
  );
  process.exit(1);
}

const jwtAccessTtl = process.env.JWT_ACCESS_TTL?.trim() || "15m";
if (!TTL_PATTERN.test(jwtAccessTtl)) {
  console.error(`\nInvalid JWT_ACCESS_TTL "${jwtAccessTtl}". Expected a number and a unit, e.g. 15m, 2h, 7d.\n`);
  process.exit(1);
}

const refreshTokenTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS?.trim() || 7);
if (!Number.isInteger(refreshTokenTtlDays) || refreshTokenTtlDays < 1) {
  console.error(
    `\nInvalid REFRESH_TOKEN_TTL_DAYS "${process.env.REFRESH_TOKEN_TTL_DAYS}". Expected a positive whole number.\n`
  );
  process.exit(1);
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  port,
  clientUrl: process.env.CLIENT_URL,
  mongoUri: process.env.MONGO_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtAccessTtl,
  refreshTokenTtlDays,
  // Browsers send Origin without a trailing slash, and cors compares the strings exactly: "https://x.app/" never matches.
  clientOrigin: process.env.CLIENT_ORIGIN.replace(/\/+$/, ""),
  // Optional, and only read by the create-admin script; never set it in a long-lived server's environment.
  createAdminPassword: process.env.CREATE_ADMIN_PASSWORD || undefined,
});
