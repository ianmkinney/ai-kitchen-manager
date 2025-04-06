import { NextConfig } from 'next';
import { initializeDatabase } from './app/lib/db-init';

// Initialize database on server startup
initializeDatabase()
  .then(success => {
    if (success) {
      console.log('Database initialization completed successfully');
    } else {
      console.error('Failed to initialize database');
    }
  })
  .catch(error => {
    console.error('Error during database initialization:', error);
  });

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"]
  }
};

export default config;
