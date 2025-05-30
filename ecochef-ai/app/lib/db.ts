import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Function to create a new PrismaClient with retry logic
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Add connection retry logic
    errorFormat: 'pretty',
  }).$extends({
    query: {
      async $allOperations({ args, query }) {
        const MAX_RETRIES = 3;
        let retries = 0;
        
        while (true) {
          try {
            return await query(args);
          } catch (error: Error | unknown) {
            // Type guard to check if error is an object with a message property
            const errorMessage = error instanceof Error ? error.message : 
              (typeof error === 'object' && error !== null && 'message' in error) ? 
              String(error.message) : 'Unknown error';
            
            // Check if this is a connection error that we should retry
            const isConnectionError = 
              errorMessage.includes("Can't reach database server") ||
              errorMessage.includes("Connection timed out") ||
              errorMessage.includes("Connection refused") ||
              errorMessage.includes("Connection terminated unexpectedly");
              
            // If we've hit max retries or it's not a connection error, throw
            if (retries >= MAX_RETRIES || !isConnectionError) {
              throw error;
            }
            
            // Exponential backoff
            const delay = Math.min(100 * Math.pow(2, retries), 2000);
            console.warn(`Database connection error. Retrying in ${delay}ms... (${retries + 1}/${MAX_RETRIES})`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;
          }
        }
      }
    }
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;