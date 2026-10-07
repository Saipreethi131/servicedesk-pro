import mongoose from "mongoose";
import { TICKET_STATUS, TICKET_STATUS_VALUES, IMPACT_VALUES, URGENCY_VALUES, PRIORITY_VALUES } from "../utils/constants.js";
import { nextSequence } from "../utils/counter.js";

// _id: false on both: priorityOverride is a single value object (not a list, an _id would be meaningless), and a
// history entry's shape is fixed to exactly { from, to, by, at } - no extra id field in every API response.
const priorityOverrideSchema = new mongoose.Schema(
  {
    value: { type: String, enum: PRIORITY_VALUES },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: { type: String },
    at: { type: Date },
  },
  { _id: false }
);

const historyEntrySchema = new mongoose.Schema(
  {
    from: { type: String },
    to: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    // Assigned once below, in pre('validate'); never from client input. Displayed as TKT-<ticketNumber> (D6.1).
    ticketNumber: { type: Number, unique: true },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be 5-200 characters"],
      maxlength: [200, "Title must be 5-200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be 10-5000 characters"],
      maxlength: [5000, "Description must be 10-5000 characters"],
    },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }, // must be a leaf; checked by the service (D5.4, D6.6)
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: TICKET_STATUS_VALUES, default: TICKET_STATUS.NEW },
    impact: { type: String, enum: IMPACT_VALUES, required: true },
    urgency: { type: String, enum: URGENCY_VALUES, required: true },
    // Set by the service via derivePriority (D5.1) at creation, never computed here - the schema only constrains the value.
    priority: { type: String, enum: PRIORITY_VALUES, required: true },
    priorityOverride: { type: priorityOverrideSchema, default: null }, // never overwrites priority; effective value = priorityOverride.value ?? priority (D6.5)
    resolvedAt: { type: Date, default: null },
    // Snapshotted at creation from SLA_TARGETS[priority] via addBusinessMinutes (P8); editing SLA_TARGETS later
    // never rewrites an existing ticket's deadlines (CLAUDE.md).
    responseDeadline: { type: Date },
    resolutionDeadline: { type: Date },
    firstResponseAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null },
    history: { type: [historyEntrySchema], default: [] },
  },
  { timestamps: true }
);

// Query shapes from D6.4's visibility scope: a department's open queue, one person's open work, one requester's tickets.
ticketSchema.index({ department: 1, status: 1 });
ticketSchema.index({ assignee: 1, status: 1 });
ticketSchema.index({ requester: 1 });

// Regular function, not an arrow: needs `this` to be the document (same reasoning as User's password hook).
// pre('validate'), not pre('save'): the number must exist before required/enum validators run on a new document,
// and isNew is still true here because it only flips to false after a successful save.
ticketSchema.pre("validate", async function () {
  if (!this.isNew) return; // ticketNumber is assigned once and is otherwise immutable
  this.ticketNumber = await nextSequence("ticket");
});

export default mongoose.model("Ticket", ticketSchema);
