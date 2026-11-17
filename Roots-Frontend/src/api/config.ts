/**
 * API settings for the app.
 *
 * API_URL comes from EXPO_PUBLIC_API_URL in .env (see .env.example).
 * Without a .env file, the app uses the production server.
 */
const PRODUCTION_API_URL = 'https://roots-plants.duckdns.org';

// Expo only fills this in when it's written exactly like this (no destructuring).
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

// Remove trailing slashes so `${API_URL}/plants` doesn't end up with "//plants".
export const API_URL = (fromEnv || PRODUCTION_API_URL).replace(/\/+$/, '');

// How long to wait for the server before giving up on a request (10 seconds).
export const REQUEST_TIMEOUT_MS = 10_000;
