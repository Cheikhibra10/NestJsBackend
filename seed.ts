import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed categories
  await prisma.categorie.createMany({
    data: [
      { libelle: 'Gold' },
      { libelle: 'Silver' },
      { libelle: 'Bronze' }, // Default category
    ],
    skipDuplicates: true, // In case categories already exist
  });

  console.log("Categories seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
