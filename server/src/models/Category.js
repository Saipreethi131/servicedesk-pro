import mongoose from "mongoose";

// Two-level tree in one collection (D5.4): a top-level category has parent null, a child points at its top-level parent.
// The depth cap and "parent never changes" are enforced in category.service.js, not here.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Category name is required"], trim: true },
    // Stored explicitly as null (not left missing) so top-level names take part in the unique index below.
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    isActive: { type: Boolean, default: true }, // soft delete: tickets keep referencing an inactive category (D5.6)
  },
  { timestamps: true }
);

// Unique per parent, ignoring case: "hardware" and "Hardware" collide under the same parent, but the same name may
// appear under different parents. Strength 2 = compare letters case-insensitively but still tell accents apart.
categorySchema.index({ parent: 1, name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
// Serves the tree listing: children of a set of parents, filtered by isActive.
categorySchema.index({ parent: 1, isActive: 1 });

export default mongoose.model("Category", categorySchema);
