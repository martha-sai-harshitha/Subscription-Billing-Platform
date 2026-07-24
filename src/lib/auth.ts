import jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  userId: string;
  email: string;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export function createAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "7d",
    issuer: "subscription-billing-platform",
    audience: "subscription-billing-users",
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "subscription-billing-platform",
    audience: "subscription-billing-users",
  }) as AuthTokenPayload;
}