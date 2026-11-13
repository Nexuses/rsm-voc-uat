/** Domain errors whose message is safe to show to an authorized dashboard user. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}
