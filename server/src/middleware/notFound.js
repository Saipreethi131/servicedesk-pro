import { ApiError } from "../utils/ApiError.js";

// Mounted with app.use() and no path, after all real routes: anything that reaches
// here matched nothing. (A "*" route would throw at startup in Express 5.)
export const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
