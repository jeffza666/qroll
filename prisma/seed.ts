import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const teacher = await db.user.upsert({
    where: { email: "teacher@tu.ac.th" },
    update: {},
    create: { email: "teacher@tu.ac.th", name: "Test Teacher", role: "TEACHER" },
  });

  const student = await db.user.upsert({
    where: { email: "test.student@dome.tu.ac.th" },
    update: {},
    create: {
      email: "test.student@dome.tu.ac.th",
      name: "Test Student",
      studentId: "0000000001",
      role: "STUDENT",
    },
  });

  console.log("Seeded:", { teacher, student });
}

main().catch(console.error).finally(() => db.$disconnect());
