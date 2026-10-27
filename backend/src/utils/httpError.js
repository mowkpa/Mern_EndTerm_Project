export class HttpError extends Error {
  constructor(status, message, code = undefined) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const httpError = (status, message, code = undefined) => {
  return new HttpError(status, message, code);
};
