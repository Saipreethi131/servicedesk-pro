import mongoose from "mongoose";

// _id is the counter's name (e.g. "ticket"), not an ObjectId: there is only ever one document per sequence,
// and findOneAndUpdate in utils/counter.js looks it up by that name.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export default mongoose.model("Counter", counterSchema);
