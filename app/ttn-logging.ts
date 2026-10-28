import { TtnError } from './ttn.ts';

// Never include arbitrary error messages, stacks, request bodies, or headers.
export function errorCode(error: unknown): string {
  if (error instanceof TtnError) return error.code;
  const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : null;
  if (typeof code === 'string' && (/^[0-9A-Z]{5}$/.test(code) || ['TTN_SCHEMA_MISSING', 'DATABASE_URL_MISSING', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(code))) return code;
  return 'INTERNAL_ERROR';
}
