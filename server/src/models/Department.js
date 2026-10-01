import mongoose from "mongoose";

// Minimal on purpose (D3.9): P5 extends it. Needed now so create-user can validate a department.
const departmentSchema = new mongoose.Schema(
  {
    // No unique: true here: that shorthand cannot carry a collation. The unique index is declared below (D5.7).
    name: { type: String, required: [true, "Department name is required"], trim: true },
    isActive: { type: Boolean, default: true }, // soft delete: users and tickets reference departments
  },
  { timestamps: true }
);

// Unique ignoring case, so "FINANCE" and "Finance" collide. Strength 2 compares letters case-insensitively but still
// tells accents apart. Same collation as Category names (D5.4).
departmentSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export default mongoose.model("Department", departmentSchema);
