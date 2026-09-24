export const sendSuccess = (res, { statusCode = 200, message = "Success", data = null } = {}) => {
  // 204 means "no content"; sending a body with it violates HTTP, so send headers only.
  if (statusCode === 204) {
    return res.status(204).end();
  }
  return res.status(statusCode).json({ success: true, message, data });
};
