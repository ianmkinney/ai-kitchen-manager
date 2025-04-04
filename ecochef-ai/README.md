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
# Install dependencies
npm install

# Set up environment variables
# Create a .env file with:
# DATABASE_URL=your_supabase_connection_string
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# CLAUDE_API_KEY=your_anthropic_api_key

# Setup local database
npx prisma migrate dev

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Features

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
