// mongoose.isValidObjectId() also accepts any 12-character string and some numbers; this accepts only 24 hex characters.
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

// Also rejects arrays and objects, which is how query-string and JSON injection ({ "$ne": null }) arrive.
export const isObjectIdString = (value) => typeof value === "string" && OBJECT_ID_PATTERN.test(value);
