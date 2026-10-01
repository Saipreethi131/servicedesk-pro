import Counter from "../models/Counter.js";

// Atomic: findOneAndUpdate's $inc is a single document operation, so concurrent callers each get a distinct,
// strictly increasing integer - no read-modify-write race. upsert creates the counter the first time it's used.
// No req/res: callable from a service, a cron job, or a script.
export const nextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter.seq;
};
