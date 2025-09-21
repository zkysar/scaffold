/**
 * SHA utility functions for content-based hashing
 */

import * as crypto from 'crypto';

/**
 * Generate a SHA-256 hash from the given content
 * @param content - The content to hash (string or Buffer)
 * @returns Full SHA-256 hash as hexadecimal string (64 characters)
 */
export function generateSHA256(content: string | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

/**
 * Get a shortened version of a SHA hash
 * @param sha - The full SHA hash
 * @param length - Desired length (default: 8)
 * @returns Shortened SHA hash
 */
export function shortSHA(sha: string, length: number = 8): string {
  if (!sha || typeof sha !== 'string') {
    throw new Error('SHA must be a non-empty string');
  }

  if (length < 4 || length > sha.length) {
    throw new Error(`Length must be between 4 and ${sha.length}`);
  }

  return sha.substring(0, length);
}

/**
 * Validate if a string is a valid SHA-256 hash
 * @param sha - The string to validate
 * @returns True if valid SHA-256 hash format
 */
export function isValidSHA(sha: string): boolean {
  if (!sha || typeof sha !== 'string') {
    return false;
  }

  // SHA-256 produces 64 hexadecimal characters
  // Also accept partial SHAs (minimum 8 characters for uniqueness)
  return /^[a-f0-9]{8,64}$/i.test(sha);
}

/**
 * Check if a short SHA matches the beginning of a full SHA
 * @param shortSha - The shortened SHA
 * @param fullSha - The full SHA to compare against
 * @returns True if short SHA is a prefix of full SHA
 */
export function compareShortSHA(shortSha: string, fullSha: string): boolean {
  if (!shortSha || !fullSha) {
    return false;
  }

  return fullSha.toLowerCase().startsWith(shortSha.toLowerCase());
}

/**
 * Find all SHAs that match a given prefix
 * @param prefix - The SHA prefix to search for
 * @param shas - Array of full SHA hashes
 * @returns Array of matching full SHAs
 */
export function findSHAByPrefix(prefix: string, shas: string[]): string[] {
  if (!prefix || !isValidSHA(prefix)) {
    return [];
  }

  const lowerPrefix = prefix.toLowerCase();
  return shas.filter(sha => sha.toLowerCase().startsWith(lowerPrefix));
}

/**
 * Generate a SHA from an object's content
 * @param obj - The object to hash
 * @param excludeKeys - Keys to exclude from hashing
 * @returns SHA-256 hash of the object's content
 */
export function generateSHAFromObject(obj: any, excludeKeys: string[] = []): string {
  const filtered = filterObject(obj, excludeKeys);
  const content = JSON.stringify(filtered, Object.keys(filtered).sort());
  return generateSHA256(content);
}

/**
 * Recursively filter an object, excluding specified keys
 */
function filterObject(obj: any, excludeKeys: string[]): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => filterObject(item, excludeKeys));
  }

  const filtered: any = {};
  for (const key of Object.keys(obj)) {
    if (!excludeKeys.includes(key)) {
      filtered[key] = filterObject(obj[key], excludeKeys);
    }
  }

  return filtered;
}