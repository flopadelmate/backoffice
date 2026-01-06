import type { AdminUser } from "@/types/api";

/**
 * Decode JWT token payload (without verification - for display purposes only)
 * In production, token validation is done server-side
 */
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  // Bypass expiration check for mock tokens (development only)
  if (token.startsWith("mock-")) {
    return false;
  }

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const expirationTime = (decoded.exp as number) * 1000; // Convert to milliseconds
  return Date.now() >= expirationTime;
}

/**
 * Extract user info from JWT token
 * This is a fallback - prefer using the user object from login response
 */
export function getUserFromToken(token: string): AdminUser | null {
  const decoded = decodeJWT(token);
  if (!decoded) {
    return null;
  }

  // Adjust these fields based on your actual JWT structure
  return {
    id: (decoded.sub as string) || (decoded.userId as string) || "",
    email: (decoded.email as string) || "",
    name: (decoded.name as string) || "",
    role: "ADMIN",
  };
}
