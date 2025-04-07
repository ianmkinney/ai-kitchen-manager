# EcoChef AI

A Next.js application for AI-powered meal planning and dietary recommendations.

## Deployment on Vercel with Supabase

This project is optimized for deployment on Vercel with Supabase for database hosting.

### Prerequisites

1. A Vercel account
2. A Supabase account
3. Anthropic API key for Claude

### Setting up Supabase

1. Create a new project in Supabase
2. Go to Settings > Database to find your connection string
3. Copy the connection string and add it as `DATABASE_URL` in your Vercel environment variables
4. From the API settings in Supabase, copy the Project URL and add it as `NEXT_PUBLIC_SUPABASE_URL`
5. Copy the anon/public key and add it as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Initialize your database schema using one of the methods below:

#### Method 1: Using the setup script (Recommended)

```bash
# Install dependencies first
npm install

# Run the setup script
npm run supabase:setup
```

The script will guide you through the initialization process and set up all required tables.

#### Method 2: Using the manual setup helper (If automated setup fails)

If you encounter any issues with the automated setup, you can use the manual setup helper:

```bash
npm run supabase:manual
```

This will display the SQL that you need to paste into the Supabase SQL Editor.

#### Method 3: Direct manual initialization

1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor"
3. Copy the contents of `supabase/init.sql` and execute it in the SQL editor

### Troubleshooting Supabase Setup

#### Connection Issues

If you encounter the error "supabaseUrl is required" during setup:

1. Make sure you're entering the full URL including `https://`
2. The URL should end with `.supabase.co` (without a trailing slash)
3. If problems persist, use the manual setup method instead

#### Database Schema Errors

If you see an error like `Could not find the 'createdAt' column` or similar:

1. Make sure you're using the latest version of the init.sql file
2. The database schema **requires double quotes** around column names (e.g., `"createdAt"` not `createdAt`)
3. The application code expects camelCase column names (e.g., `createdAt` not `created_at`)
4. If you've previously created tables with a different naming convention, they should be dropped first
5. Our initialization script now includes `DROP TABLE IF EXISTS` statements to handle this automatically
6. Run `npm run supabase:manual` to see the correct SQL schema with proper column naming
7. Execute the provided SQL directly in the Supabase SQL Editor

#### Sequence-related Errors

If you see errors like `relation "users_id_seq" does not exist`:

1. This is normal because our tables use UUID keys instead of SERIAL/SEQUENCE IDs
2. The updated initialization script has removed these grants
3. Re-run the SQL setup using the latest version of the init.sql file

#### Data Retrieval Issues

If you encounter errors when adding or retrieving data:

1. In the Supabase dashboard, go to the SQL Editor and run:
   ```sql
   SELECT * FROM users;
   SELECT * FROM user_preferences;
   SELECT * FROM pantry_items;
   ```
2. Verify that columns are named with camelCase and have double quotes in the schema
3. If they don't match the expected format, it's best to drop and recreate the tables using our init script

#### Permissions Issues

If you encounter permissions errors when adding data:

1. Make sure Row Level Security (RLS) is properly set up by the initialization script
2. For testing, use the anonymous user ID: `00000000-0000-0000-0000-000000000000`
3. In production, integrate proper authentication and update the user ID accordingly

### Environment Variables

Set these environment variables in your Vercel project:

- `CLAUDE_API_KEY`: Your Anthropic API key
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `NEXT_PUBLIC_API_URL`: API URL (usually set automatically by Vercel)

### Deployment Steps

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Vercel project settings
4. Deploy

## Local Development

```bash
# Install dependencies (be sure you cd into ecochef-ai directory)
npm install

# Set up environment variables
# Create a .env file with:
# DATABASE_URL=your_supabase_connection_string
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# CLAUDE_API_KEY=your_anthropic_api_key

# Initialize database (if not done already)
npm run supabase:setup
# Or use the manual setup if the above fails
npm run supabase:manual

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Database Schema

The application uses the following tables in Supabase:

1. **users** - Stores user information 
2. **user_preferences** - Stores dietary preferences and cooking preferences
3. **pantry_items** - Stores ingredients in user pantry

See `supabase/init.sql` for the complete schema definition.

### Column Naming Conventions

This application uses camelCase for column names (e.g., `createdAt`, `userId`) which requires special handling in PostgreSQL:

1. In SQL definitions, column names are wrapped in double quotes: `"createdAt"`
2. In application code, they are referenced directly as camelCase: `createdAt`
3. This is different from PostgreSQL's default snake_case convention
4. The initialization script handles this automatically

## Features

- Meal planning based on dietary preferences
- Pantry management
- Recipe suggestions
- Interactive dietary preferences quiz
- AI-powered cooking assistant
- User profile page for viewing saved preferences
- Custom error handling and 404 pages

## Application Pages

### Main Features

- **Home**: Landing page with overview of the application
- **Meal Planning**: Plan meals based on your dietary preferences
- **Pantry**: Manage your available ingredients
- **Recipes**: Browse and search recipes
- **Preferences Quiz**: Set your dietary and cooking preferences
- **Profile**: View your saved preferences and personalized insights

### Error Handling

The application includes custom error pages:

- **404 Page**: Provides a user-friendly experience when a page is not found
- **Error Page**: Handles runtime errors gracefully with options to retry or navigate home

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
