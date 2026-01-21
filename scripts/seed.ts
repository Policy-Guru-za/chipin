import { seedDatabase } from '../src/lib/db/seed';

async function main() {
  await seedDatabase();
  console.log('Seed completed');
}

main().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
