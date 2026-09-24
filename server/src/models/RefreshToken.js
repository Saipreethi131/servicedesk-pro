import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // SHA-256 of the raw token (D2.4). The raw value is never stored, so a database leak yields no usable tokens.
    tokenHash: { type: String, required: true, unique: true },
    // Every token issued from one login shares a family; reuse of a revoked token revokes the whole family (D2.5).
    familyId: { type: String, required: true, index: true },
    // TTL index: MongoDB deletes the document once this date passes (0 = "at exactly expiresAt").
    // The deletion job runs about once a minute, so authentication must still check expiresAt itself.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("RefreshToken", refreshTokenSchema);
