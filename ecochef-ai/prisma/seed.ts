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

  try {
    // Create user preferences separately
    // Note: We're using the Prisma raw query to ensure we use the exact column names
    // from the SQL schema due to the @map directive usage
    const userPreferences = await prisma.$queryRaw`
      INSERT INTO "public"."user_preferences" 
      ("id", "userid", "isVegetarian", "isVegan", "isGlutenFree", "isDairyFree", "maxCookingTime", "peopleCount", "cuisine", "createdAt", "updatedAt") 
      VALUES 
      (gen_random_uuid(), ${demoUser.id}, false, false, false, false, 60, 2, 'Any', now(), now())
      RETURNING *;
    `;

    // Create some pantry items for demo user
    const pantryItems = await Promise.all([
      prisma.$queryRaw`
        INSERT INTO "public"."pantry_items"
        ("id", "userid", "itemName", "category", "quantity", "unit", "createdAt", "updatedAt")
        VALUES
        (gen_random_uuid(), ${demoUser.id}, 'Rice', 'Grains', 2, 'kg', now(), now())
        RETURNING *;
      `,
      prisma.$queryRaw`
        INSERT INTO "public"."pantry_items"
        ("id", "userid", "itemName", "category", "quantity", "unit", "createdAt", "updatedAt")
        VALUES
        (gen_random_uuid(), ${demoUser.id}, 'Chicken', 'Meat', 1, 'kg', now(), now())
        RETURNING *;
      `,
      prisma.$queryRaw`
        INSERT INTO "public"."pantry_items"
        ("id", "userid", "itemName", "category", "quantity", "unit", "createdAt", "updatedAt")
        VALUES
        (gen_random_uuid(), ${demoUser.id}, 'Tomatoes', 'Vegetables', 5, 'count', now(), now())
        RETURNING *;
      `
    ]);

    console.log('Database seeded with demo user, preferences, and pantry items:', 
      { user: demoUser, preferences: userPreferences, pantryItems });
  } catch (error) {
    console.error('Error creating database records:', error);
  }
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });