/**
 * The logged-in account from /login or /register. Kept in memory like the token in client.ts,
 * so it's cleared when the app restarts.
 */
import { setAuthToken } from './client';

export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  created_at: string;
};

let currentUser: User | null = null;

// setCurrentUser saves the account after login. Pass null to forget it.
export function setCurrentUser(user: User | null) {
  currentUser = user;
}
// getCurrentUser returns the account after login, or null if not logged in.
export function getCurrentUser() {
  return currentUser;
}

// signOut forgets the token and the account, so the next request isn't logged in.
export function signOut() {
  setAuthToken(null);
  currentUser = null;
}