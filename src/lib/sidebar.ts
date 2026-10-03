// Remembers whether the sidebar is open on desktop, so the server renders it
// in the right state and it doesn't flash open/closed on reload.
export const SIDEBAR_COOKIE = "sidebar_open";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
