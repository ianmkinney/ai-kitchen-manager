import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@ecochef.ai' },
    update: {},
    create: {
      email: 'demo@ecochef.ai',
      name: 'Demo User',
      preferences: {
        create: {
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          isDairyFree: false,
          maxCookingTime: 60,
        }
      }
    },
    include: {
      preferences: true,
    },
  });

  console.log('Database seeded with demo user:', demoUser);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 