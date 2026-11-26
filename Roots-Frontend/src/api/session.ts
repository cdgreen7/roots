/**
 * The logged-in account from /login or /register. Kept in memory like the token in client.ts,
 * so it's cleared when the app restarts.
 */
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

export function getCurrentUser() {
  return currentUser;
}