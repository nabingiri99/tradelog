const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = 'Internal server error';
  let errors;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((item) => item.message);
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value detected';
  }

  if (statusCode === 500) {
    console.error(`[${req.method} ${req.originalUrl}] ${err.stack || err.message}`);
  }

  const payload = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV !== 'production' && statusCode === 500 && { stack: err.stack }),
  };

  res.status(statusCode).json(payload);
};

module.exports = { notFound, errorHandler };
