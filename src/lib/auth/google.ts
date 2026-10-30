import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

export class GoogleAuthError extends Error {}

export function googleRedirectUri(): string {
  return `${env.appUrl}/api/auth/google/callback`;
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createState(): string {
  return randomBytes(24).toString("base64url");
}

export function googleAuthUrl(state: string, challenge: string): string {
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeGoogleCode(
  code: string,
  verifier: string,
): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: env.google.clientId,
    client_secret: env.google.clientSecret,
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
    code_verifier: verifier,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json = (await response.json()) as TokenResponse;
  if (!response.ok || !json.access_token) {
    throw new GoogleAuthError(
      json.error_description || json.error || "Google sign-in failed.",
    );
  }
  return json.access_token;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new GoogleAuthError("Could not read your Google profile.");
  }
  const profile = (await response.json()) as GoogleProfile;
  if (!profile.email || !profile.email_verified) {
    throw new GoogleAuthError("Your Google email is not verified.");
  }
  return profile;
}
