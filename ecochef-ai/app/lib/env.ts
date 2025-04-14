// Environment variable helper with validation
export const env = {
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  
  // Validation helper
  validate() {
    const missing = [];
    // Check for either CLAUDE_API_KEY or ANTHROPIC_API_KEY
    if (!this.CLAUDE_API_KEY && !this.ANTHROPIC_API_KEY) missing.push('CLAUDE_API_KEY or ANTHROPIC_API_KEY');
    if (!this.DATABASE_URL) missing.push('DATABASE_URL');
    if (!this.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!this.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return true;
  },
  
  // Helper to get the appropriate API key
  getAnthropicApiKey() {
    return this.ANTHROPIC_API_KEY || this.CLAUDE_API_KEY || '';
  }
};

// Validate in development but not during build time
if (process.env.NODE_ENV !== 'production') {
  try {
    env.validate();
  } catch (error) {
    console.warn('Environment validation warning:', (error as Error).message);
  }
}