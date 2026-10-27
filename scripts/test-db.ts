import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const prisma = new PrismaClient({ adapter });

async function main() {
  for (let i = 1; i <= 5; i++) {
    console.time(`query-${i}`);

    const result = await prisma.$queryRaw<
      { now: Date }[]
    >`SELECT NOW()`;

    console.timeEnd(`query-${i}`);
    console.log(result[0]);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });