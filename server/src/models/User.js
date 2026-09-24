import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { ROLES, ROLE_VALUES } from "../utils/constants.js";

const BCRYPT_COST = 12; // each +1 doubles the hashing time; 12 is a common balance of safety vs. login latency
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, "First name is required"], trim: true },
    lastName: { type: String, required: [true, "Last name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // creates the unique index; declaring schema.index() as well would duplicate it
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, "Email is not a valid address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      // Validated on the plaintext: validation runs before the pre('save') hook that hashes it.
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // excluded from query results unless asked for with .select("+password")
    },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.EMPLOYEE },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" }, // model arrives in P5
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true }, // soft delete: tickets and audit entries reference users
    lastLoginAt: { type: Date },
    mustChangePassword: { type: Boolean, default: false }, // set when an admin issues a temporary password (D2.8)
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Query shape P3's scope filter will use.
userSchema.index({ role: 1, department: 1 });

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Regular function, not an arrow: Mongoose sets `this` to the document being saved.
userSchema.pre("save", async function () {
  // Without this guard, saving any other change would hash the existing hash.
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_COST);
});

userSchema.methods.comparePassword = function (candidate) {
  // password is select:false, so it's missing unless the query used .select("+password").
  // Failing loudly beats bcrypt's cryptic error, or a silent "wrong password".
  if (!this.password) {
    throw new Error('comparePassword needs the hash: query with .select("+password")');
  }
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
