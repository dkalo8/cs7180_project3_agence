'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Only forward 4xx if explicitly set as an app-level error (not upstream API bleed-through)
  const status = (err.status >= 400 && err.status < 500 && err.isOperational) ? err.status : 500;
  const message = status < 500 ? (err.message || 'Internal Server Error') : 'Internal Server Error';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
