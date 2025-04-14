import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a demo user without preferences
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@ecochef.ai' },
    update: {},
    create: {
      email: 'demo@ecochef.ai',
      name: 'Demo User',
    }
  });

  console.log('User created:', demoUser);

  // Create user preferences separately
  const userPreferences = await prisma.user_preferences.create({
    data: {
      userId: demoUser.id, // Link to the user by ID
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      maxCookingTime: 60,
    }
  });

  console.log('Database seeded with demo user and preferences:', { user: demoUser, preferences: userPreferences });
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });