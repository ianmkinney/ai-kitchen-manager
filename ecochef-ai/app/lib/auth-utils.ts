// Password hashing utilities
const AUTH_SECRET = process.env.AUTH_SECRET || 'ecochef-secret-key';

/**
 * Generate a hash for a password
 * WARNING: This is a basic implementation for demo purposes.
 * In production, use bcrypt or a similar library with proper salt rounds.
 */
export function hashPassword(password: string): string {
  try {
    // Ensure consistent encoding and avoid any potential encoding issues
    const input = `${password}:${AUTH_SECRET}`;
    
    // Use a consistent Base64 encoding
    return Buffer.from(input, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    console.error('Error hashing password:', error);
    // Fallback to simpler encoding if there's an error
    return Buffer.from(`${password}:${AUTH_SECRET}`).toString('base64');
  }
}

/**
 * Verify a password against a hash with multiple fallback methods
 */
export function verifyPassword(password: string, hash: string): boolean {
  try {
    // Method 1: Direct hash comparison (our primary method)
    const generatedHash = hashPassword(password);
    
    if (generatedHash === hash) {
      return true;
    }
    
    // Method 2: Try with standard Base64 encoding (for backward compatibility)
    const simpleHash = Buffer.from(`${password}:${AUTH_SECRET}`).toString('base64');
    if (simpleHash === hash) {
      console.log('Password matched using legacy encoding');
      return true;
    }
    
    // Method 3: Try with trimmed hash (in case there are whitespace issues)
    const trimmedHash = hash.trim();
    if (generatedHash === trimmedHash || simpleHash === trimmedHash) {
      console.log('Password matched after trimming stored hash');
      return true;
    }

    // Method 4: Case-insensitive comparison as a last resort
    if (generatedHash.toLowerCase() === hash.toLowerCase()) {
      console.log('Password matched with case-insensitive comparison');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
} 