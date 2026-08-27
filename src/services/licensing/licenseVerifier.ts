/**
 * Offline-First Cryptographic License Verifier
 * 
 * Verifies signed license certificates offline using an embedded Public Verification Key.
 * The Private Signing Key remains strictly external and is NEVER included in this application.
 */

import crypto from "crypto";

export type LicenseEdition = "free" | "pro" | "commercial";
export type LicenseStatus = "UNLICENSED" | "ACTIVE" | "EXPIRED" | "INVALID";

export interface LicensePayload {
  licenseKey: string;
  licensee: string;
  licenseeEmail?: string;
  edition: LicenseEdition;
  issuedAt: number;
  expiresAt: number | null; // null for lifetime
  maxSeats?: number;
  features?: string[];
  machineId?: string;
}

export interface StoredLicenseData {
  rawCertificate: string;
  payload: LicensePayload;
  signature: string;
}

export interface LicenseInfo {
  status: LicenseStatus;
  edition: LicenseEdition;
  licensee?: string;
  licenseeEmail?: string;
  licenseKey?: string;
  issuedAt?: number;
  expiresAt?: number | null;
  isLifetime?: boolean;
  daysRemaining?: number | null;
  features: string[];
  error?: string;
}

/**
 * Public Verification Key (RSA / EC Public Key PEM format)
 * This is public-safe and contains ONLY the verification exponent and modulus.
 */
export const EMBEDDED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2Z3kX48QO5W5M7o4Qv9FpZ5v4iE9
bL4WkQ2RzXw9bN8vP2qR4sT7uV1wX3yZ6aB9cD2eF5gH8jK1mN4pQ7rS9A==
-----END PUBLIC KEY-----`;

/**
 * Default Free Tier License Info (Community Edition)
 */
export const DEFAULT_FREE_LICENSE: LicenseInfo = {
  status: "UNLICENSED",
  edition: "free",
  licensee: "Community User",
  isLifetime: true,
  features: [
    "core_prompt_library",
    "multilingual_markdown",
    "workspaces_and_projects",
    "quick_capture_tray",
  ],
};

/**
 * Verify a raw license certificate string or token offline.
 * Requires a cryptographically valid 3-part signed certificate (HEADER.PAYLOAD.SIGNATURE).
 */
export function verifyLicenseCertificate(rawInput: string): {
  valid: boolean;
  info: LicenseInfo;
  error?: string;
} {
  const cleanInput = rawInput.trim();
  if (!cleanInput) {
    return { valid: false, info: DEFAULT_FREE_LICENSE, error: "License key cannot be empty." };
  }

  try {
    let payload: LicensePayload | null = null;
    let signatureVerified = false;

    // Cryptographic Base64URL token: HEADER.PAYLOAD.SIGNATURE
    if (cleanInput.includes(".")) {
      const parts = cleanInput.split(".");
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        try {
          const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
          payload = JSON.parse(payloadJson);

          const verifier = crypto.createVerify("SHA256");
          verifier.update(`${parts[0]}.${parts[1]}`);
          signatureVerified = verifier.verify(EMBEDDED_PUBLIC_KEY, parts[2], "base64url");
        } catch {
          signatureVerified = false;
        }
      }
    }

    if (!signatureVerified || !payload || !payload.edition) {
      return {
        valid: false,
        info: { ...DEFAULT_FREE_LICENSE, status: "INVALID" },
        error: "Invalid license certificate or unverified signature. Please enter a valid signed token.",
      };
    }

    // Check expiration timestamp
    const now = Date.now();
    if (payload.expiresAt && payload.expiresAt < now) {
      return {
        valid: false,
        info: {
          status: "EXPIRED",
          edition: payload.edition,
          licensee: payload.licensee,
          licenseKey: payload.licenseKey,
          issuedAt: payload.issuedAt,
          expiresAt: payload.expiresAt,
          isLifetime: false,
          daysRemaining: 0,
          features: DEFAULT_FREE_LICENSE.features,
          error: "This commercial license expired on " + new Date(payload.expiresAt).toLocaleDateString(),
        },
        error: "This commercial license has expired.",
      };
    }

    const daysRemaining = payload.expiresAt
      ? Math.max(0, Math.ceil((payload.expiresAt - now) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      valid: true,
      info: {
        status: "ACTIVE",
        edition: payload.edition,
        licensee: payload.licensee || "Licensed User",
        licenseeEmail: payload.licenseeEmail,
        licenseKey: payload.licenseKey || "CUSTOM-KEY",
        issuedAt: payload.issuedAt || now,
        expiresAt: payload.expiresAt,
        isLifetime: payload.expiresAt === null,
        daysRemaining,
        features: payload.features || ["core_prompt_library", "multilingual_markdown", "workspaces_and_projects", "quick_capture_tray", "batch_export_import"],
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      info: { ...DEFAULT_FREE_LICENSE, status: "INVALID" },
      error: "Could not parse or verify license certificate: " + (err.message || "Unknown error"),
    };
  }
}

/**
 * Check if the active license grants entitlement to a specific feature
 */
export function hasEntitlement(license: LicenseInfo | null | undefined, feature: string): boolean {
  if (!license || license.status !== "ACTIVE") {
    // Free community tier defaults
    return DEFAULT_FREE_LICENSE.features.includes(feature);
  }
  return license.features.includes(feature);
}
