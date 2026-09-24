import mongoose from "mongoose";

// Minimal on purpose (D3.9): P5 extends it. Needed now so create-user can validate a department.
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      unique: true, // creates the unique index; no separate schema.index() (see User.js)
    },
    isActive: { type: Boolean, default: true }, // soft delete: users and tickets reference departments
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
