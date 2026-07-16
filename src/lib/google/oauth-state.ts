// Cookie carrying the random per-flow OAuth state nonce. Set by
// /api/google/authorize, verified and cleared by /api/google/callback.
export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
