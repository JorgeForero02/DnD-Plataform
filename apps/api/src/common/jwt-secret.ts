export const JWT_SECRET_MIN_LENGTH = 32;

/**
 * Reads and validates JWT_SECRET from the environment. Throws instead of falling back to a
 * default: a deploy missing this variable must refuse to start rather than sign tokens with a
 * secret anyone can read in the public repository.
 */
export function requireJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  // Trimmed before either check: a whitespace-only value (or one padded with it) must not
  // slip past the empty check or count its padding towards the minimum length.
  const secret = env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required and must not be empty. Set it before starting the API.",
    );
  }
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters long. Set a longer value before starting the API.`,
    );
  }
  return secret;
}
