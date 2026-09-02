import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import type { KeyObject } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { PROTOCOL_DATA_DIR } from "./paths";
import type { AuthorialManifest, ManifestSignature } from "./types";

/**
 * Sovereign signing. The protocol signs its own manifests with a locally
 * generated Ed25519 keypair held on the operator's disk — there is no external
 * CA, no notary API, no third-party timestamping service in the trust path.
 */

const KEY_DIR = join(PROTOCOL_DATA_DIR, "keys");
const PRIVATE_KEY_PATH = join(KEY_DIR, "protocol-ed25519.private.pem");
const PUBLIC_KEY_PATH = join(KEY_DIR, "protocol-ed25519.public.pem");

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * RFC 8785-style canonical JSON: object keys sorted, no insignificant
 * whitespace. Signing and verification both run through this so the signed
 * byte sequence is reproducible from the parsed manifest alone.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

type KeyPair = { privateKey: KeyObject; publicKey: KeyObject };

let cached: KeyPair | null = null;

/**
 * Load the operator's signing key, generating it on first use.
 *
 * The private key never leaves this machine and is written 0600. Losing it
 * means future seals are signed by a new identity; already-sealed files stay
 * verifiable because every manifest carries the public key that signed it.
 */
export async function loadSigningKeys(): Promise<KeyPair> {
  if (cached) return cached;
  await mkdir(KEY_DIR, { recursive: true });

  try {
    const [priv, pub] = await Promise.all([
      readFile(PRIVATE_KEY_PATH, "utf8"),
      readFile(PUBLIC_KEY_PATH, "utf8"),
    ]);
    cached = {
      privateKey: createPrivateKey(priv),
      publicKey: createPublicKey(pub),
    };
    return cached;
  } catch {
    /* first run — fall through and mint a keypair */
  }

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  const pubPem = publicKey.export({ type: "spki", format: "pem" }) as string;
  await writeFile(PRIVATE_KEY_PATH, privPem, "utf8");
  await writeFile(PUBLIC_KEY_PATH, pubPem, "utf8");
  await chmod(PRIVATE_KEY_PATH, 0o600).catch(() => undefined);

  cached = { privateKey, publicKey };
  return cached;
}

export function publicKeyB64(publicKey: KeyObject): string {
  return (publicKey.export({ type: "spki", format: "der" }) as Buffer).toString("base64");
}

/** Stable operator identity: SHA-256 of the DER-encoded public key. */
export function keyIdFor(publicKey: KeyObject): string {
  return sha256Hex(publicKey.export({ type: "spki", format: "der" }) as Buffer);
}

export async function signManifest(manifest: AuthorialManifest): Promise<ManifestSignature> {
  const { privateKey, publicKey } = await loadSigningKeys();
  const payload = Buffer.from(canonicalJson(manifest), "utf8");
  // Ed25519 signs the message directly — the digest argument must be null.
  const signature = sign(null, payload, privateKey);
  return {
    algorithm: "Ed25519",
    key_id: keyIdFor(publicKey),
    public_key_spki_b64: publicKeyB64(publicKey),
    signature_b64: signature.toString("base64"),
    signed_digest: sha256Hex(payload),
  };
}

/**
 * Verify a detached manifest signature.
 *
 * The public key is taken from the signature block itself, so a file can be
 * verified by anyone holding only the file. Whether that key is *the operator's*
 * key is a separate question — compare `key_id` against the published one.
 */
export function verifyManifestSignature(
  manifest: AuthorialManifest,
  signature: ManifestSignature,
): boolean {
  if (signature.algorithm !== "Ed25519") return false;
  try {
    const payload = Buffer.from(canonicalJson(manifest), "utf8");
    if (sha256Hex(payload) !== signature.signed_digest) return false;
    const publicKey = createPublicKey({
      key: Buffer.from(signature.public_key_spki_b64, "base64"),
      format: "der",
      type: "spki",
    });
    return verify(null, payload, publicKey, Buffer.from(signature.signature_b64, "base64"));
  } catch {
    return false;
  }
}

/**
 * Bind the four tiers into a single value.
 *
 * Hashes are sorted before joining so the cross-hash is independent of valve
 * ordering, and every sealed file carries the same one: altering any single
 * tier is detectable from any of the other three.
 */
export function computeCrossHash(payloadHashes: string[]): string {
  return sha256Hex([...payloadHashes].sort().join("|"));
}
