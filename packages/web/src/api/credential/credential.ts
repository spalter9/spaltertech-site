import { canonicalJson, sha256Hex, signCanonical, verifyCanonical } from "../protocol/crypto";
import type { ManifestSignature } from "../protocol/types";
import {
  canEmbed,
  embedCredential,
  extractCredential,
  sniffFormat,
  stripCredential,
  type ImageFormat,
} from "./container";
import { detectDisclosures, type Disclosure } from "./detect";

/**
 * SSP Credit Layer — a signed authorship credential that leads with the person.
 *
 * An AI disclosure answers "what tools touched this?" and nothing else, which
 * is why on its own it reads as "nobody made this". The credential answers the
 * question that matters for a professional — who made the creative decisions,
 * and which ones — and carries the disclosure inside it as one line of the
 * record rather than the headline. Both stay in the file: the credential is
 * signed over the original bytes, so stripping the disclosure would break it.
 */

export const CREDENTIAL_SCHEMA = "https://spalter.tech/schemas/ssp-credential/1";

export type CreditRole = "creator" | "director" | "artist" | "designer" | "photographer" | "producer";

export type CredentialInput = {
  fileName: string;
  creatorName: string;
  role: CreditRole;
  /** What the person actually did — concept, composition, edits, selection. */
  contributions: string[];
  /** AI tools the creator declares, in their own words. */
  declaredTools: string[];
  statement?: string;
};

export type AuthorshipCredential = {
  schema: typeof CREDENTIAL_SCHEMA;
  credential_id: string;
  issued_at: string;
  credit: {
    creator: string;
    role: CreditRole;
    contributions: string[];
    statement?: string;
  };
  subject: {
    file_name: string;
    format: ImageFormat;
    byte_length: number;
    /** SHA-256 of the file exactly as uploaded — every prior disclosure included. */
    content_sha256: string;
  };
  ai_disclosure: {
    declared_tools: string[];
    detected: Disclosure[];
    /** The disclosures above are still in the file; the credential is bound to them. */
    preserved_in_file: true;
  };
};

export type SignedCredential = {
  credential: AuthorshipCredential;
  signature: ManifestSignature;
};

export type IssueResult = {
  signed: SignedCredential;
  /** The credited file, or null when the format only supports a sidecar. */
  credited_file: Uint8Array | null;
  sidecar_json: string;
};

export async function issueCredential(original: Uint8Array, input: CredentialInput): Promise<IssueResult> {
  // A file that already carries one of our credentials is re-credited from its
  // underlying original, so credentials replace each other rather than nest.
  const bytes = stripCredential(original);
  const format = sniffFormat(bytes);
  const report = detectDisclosures(bytes);
  const contentHash = sha256Hex(bytes);
  const issuedAt = new Date().toISOString();

  const credential: AuthorshipCredential = {
    schema: CREDENTIAL_SCHEMA,
    credential_id: `SSP-CR-${sha256Hex(`${contentHash}|${issuedAt}|${crypto.randomUUID()}`).slice(0, 16).toUpperCase()}`,
    issued_at: issuedAt,
    credit: {
      creator: input.creatorName,
      role: input.role,
      contributions: input.contributions,
      ...(input.statement ? { statement: input.statement } : {}),
    },
    subject: {
      file_name: input.fileName,
      format,
      byte_length: bytes.byteLength,
      content_sha256: contentHash,
    },
    ai_disclosure: {
      declared_tools: input.declaredTools,
      detected: report.disclosures,
      preserved_in_file: true,
    },
  };

  const signed: SignedCredential = { credential, signature: await signCanonical(credential) };
  const sidecar = canonicalJson(signed);
  return {
    signed,
    credited_file: canEmbed(format) ? embedCredential(bytes, sidecar) : null,
    sidecar_json: sidecar,
  };
}

export type VerifyResult = {
  found: boolean;
  signature_valid: boolean;
  /** The file bytes (minus our credential) still hash to what was signed. */
  content_intact: boolean;
  /** Every disclosure recorded at issue time is still present in the file. */
  disclosures_intact: boolean;
  credential: AuthorshipCredential | null;
  signer_key_id: string | null;
  problems: string[];
};

/**
 * Verify a credited file, or an original file against a sidecar.
 *
 * Passing `sidecarJson` checks a file whose format could not carry the
 * credential inline.
 */
export function verifyCredential(fileBytes: Uint8Array, sidecarJson?: string): VerifyResult {
  const raw = sidecarJson ?? extractCredential(fileBytes);
  const empty: VerifyResult = {
    found: false,
    signature_valid: false,
    content_intact: false,
    disclosures_intact: false,
    credential: null,
    signer_key_id: null,
    problems: ["No SSP credential found in this file"],
  };
  if (!raw) return empty;

  let signed: SignedCredential;
  try {
    signed = JSON.parse(raw) as SignedCredential;
    if (!signed?.credential?.subject || !signed.signature) throw new Error("shape");
  } catch {
    return { ...empty, found: true, problems: ["Credential is present but unreadable"] };
  }

  const problems: string[] = [];
  const signatureValid = verifyCanonical(signed.credential, signed.signature);
  if (!signatureValid) problems.push("Signature does not match the credential — it was altered after signing");

  const original = stripCredential(fileBytes);
  const contentIntact = sha256Hex(original) === signed.credential.subject.content_sha256;
  if (!contentIntact) problems.push("File contents changed since the credential was issued");

  const now = detectDisclosures(original).disclosures;
  const disclosuresIntact = signed.credential.ai_disclosure.detected.every((d) =>
    now.some((n) => n.kind === d.kind && n.location === d.location),
  );
  if (!disclosuresIntact) problems.push("A recorded AI disclosure was removed from the file");

  return {
    found: true,
    signature_valid: signatureValid,
    content_intact: contentIntact,
    disclosures_intact: disclosuresIntact,
    credential: signed.credential,
    signer_key_id: signed.signature.key_id,
    problems,
  };
}
