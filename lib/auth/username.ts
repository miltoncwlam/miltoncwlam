const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const AUTH_EMAIL_DOMAIN = "users.interns-ai-flashcard.local";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

export function getUsernameValidationError(username: string) {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return "Username is required.";
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return "Username must be 3-20 characters and use only letters, numbers, or underscores.";
  }

  return null;
}
