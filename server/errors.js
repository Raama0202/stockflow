export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export class ValidationError extends HttpError {
  constructor(fields) {
    super(400, 'Please fix the highlighted fields.', fields);
  }
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, fields: err.fields });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
