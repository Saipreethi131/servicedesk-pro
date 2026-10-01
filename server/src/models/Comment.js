import mongoose from "mongoose";

// No edit, no delete, no attachments (deferred - D6.7). isInternal comments are stripped from the response for
// EMPLOYEE actors by the service layer, not here: the model stores everything it's given.
const commentSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: {
      type: String,
      required: [true, "Comment body is required"],
      trim: true,
      minlength: [1, "Comment must be 1-5000 characters"],
      maxlength: [5000, "Comment must be 1-5000 characters"],
    },
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: true } // only createdAt is needed (D6.7), but the standard option is used for consistency with every other model
);

export default mongoose.model("Comment", commentSchema);
