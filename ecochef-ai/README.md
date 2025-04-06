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
6. Copy the service role key and add it as `SUPABASE_SERVICE_ROLE_KEY`

### Authentication System

EcoChef AI uses a simple username and passcode authentication system, managed by Supabase:

- Users register with a username and passcode
- Authentication uses Supabase Auth with a generated email behind the scenes
- User preferences are stored and managed in Supabase
- Database tables are automatically initialized on application startup
- An admin user is created automatically if one doesn't exist

#### Admin Account

The system automatically creates an admin account on startup if none exists:
- Default username: `admin` (configurable via `ADMIN_USERNAME` env var)
- Default passcode: `admin123` (configurable via `ADMIN_PASSCODE` env var)

**Important:** Change the default admin passcode in production by setting the `ADMIN_PASSCODE` environment variable.

### Environment Variables

Set these environment variables in your Vercel project:

- `CLAUDE_API_KEY`: Your Anthropic API key
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `ADMIN_SETUP_TOKEN`: Secret token for initializing the database manually (optional)
- `ADMIN_USERNAME`: Custom admin username (defaults to 'admin')
- `ADMIN_PASSCODE`: Custom admin passcode (defaults to 'admin123')
- `NEXT_PUBLIC_API_URL`: API URL (usually set automatically by Vercel)

### Deployment Steps

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Vercel project settings
4. Deploy

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
# Create a .env file with:
# DATABASE_URL=your_supabase_connection_string
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
# CLAUDE_API_KEY=your_anthropic_api_key
# ADMIN_SETUP_TOKEN=your_secret_token

# Setup database
npm run prisma:migrate

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Features

- Simple username/passcode authentication
- User preferences stored in Supabase
- Meal planning based on dietary preferences
- Pantry management
- Recipe suggestions
- Interactive dietary preferences quiz
- AI-powered cooking assistant

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database Setup

EcoChef AI uses Supabase for authentication and database storage. After setting up your Supabase project:

1. Run the `setup-tables.sql` script in the Supabase SQL Editor to create the base tables
2. Run the `setup-pantry-table.sql` script to create the pantry_items table
3. If needed, run `direct-table-setup.sql` for a direct setup approach

Make sure to copy your Supabase credentials to the `.env` file.

## Important Note about the Tables

The application requires two tables in Supabase:
- `User` - Stores user information
- `UserPreferences` - Stores user preferences, including dietary restrictions, cooking preferences, etc.

The `UserPreferences` table must include the following fields:
- `user_id` (UUID) - Foreign key to User table
- `cuisine` (text) - Favorite cuisine
- `people_count` (integer) - Number of people to cook for
- `preferred_cuisines` (text array) - List of cuisines to explore

Make sure these fields exist in your Supabase database for the application to work correctly.

## Test User Login

The application is configured with a hardcoded test user:
- Username: `test`
- Passcode: `123`

User preferences for this test user will be automatically stored in Supabase.

## Pantry Management with AI Integration

The pantry management system features:

1. **Simple Free-Text Entry**: Add ingredients to your pantry with a straightforward text input
2. **Direct Supabase Storage**: Pantry items are stored in Supabase for fast access and persistence
3. **AI-Powered Shopping List Suggestions**: Get smart recommendations for what to buy next based on your current pantry inventory
4. **Recipe Suggestions**: Find recipes that maximize the use of ingredients you already have

### How It Works

1. Add items to your pantry using the simple text input
2. Click "Get Suggestions" to receive AI-generated shopping list recommendations
3. For each suggestion, you'll see why it complements your existing pantry
4. You'll also get recipe ideas that combine your current pantry with the suggested items

### Anthropic Claude Integration

The application uses Anthropic's Claude AI for intelligent recommendations:
- Claude analyzes your pantry contents to suggest complementary ingredients
- It considers your dietary preferences when making suggestions
- The AI generates recipe ideas that make the most of what you have
