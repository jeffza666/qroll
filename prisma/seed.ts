import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // BYPASS_TU_AUTH dev login looks up users by email.
  // Real TU login still uses TU username/password and maps role from TU API `type`.
  const teacher = await db.user.upsert({
    where: { email: "teacher@tu.ac.th" },
    update: {},
    create: {
      email: "teacher@tu.ac.th",
      name: "อาจารย์ทดสอบ",
      role: "TEACHER",
    },
  });

    const teacher2 = await db.user.upsert({
    where: { email: "teacher2@tu.ac.th" },
    update: {},
    create: {
      email: "teacher2@tu.ac.th",
      name: "อาจารย์ทดสอบ 2",
      role: "TEACHER",
    },
  });

  const student = await db.user.upsert({
    where: { studentId: "6500000001" },
    update: {
      email: "test.student@dome.tu.ac.th",
      name: "นักศึกษาทดสอบ",
    },
    create: {
      email: "test.student@dome.tu.ac.th",
      name: "นักศึกษาทดสอบ",
      studentId: "6500000001",
      role: "STUDENT",
    },
  });

  // Phase 4.6 behavior: roster/manual add can pre-import a student
  // before first TU login, so email intentionally starts as null.
  const preImportedStudent = await db.user.upsert({
    where: { studentId: "6500000000" },
    update: {},
    create: {
      email: null,
      name: "นักศึกษารอเชื่อมบัญชี",
      studentId: "6500000000",
      role: "STUDENT",
    },
  });

  const student2 = await db.user.upsert({
    where: { studentId: "6500000002" },
    update: {
      email: "test.student2@dome.tu.ac.th",
      name: "นักศึกษาทดสอบ2",
    },
    create: {
      email: "test.student2@dome.tu.ac.th",
      name: "นักศึกษาทดสอบ2",
      studentId: "6500000002",
      role: "STUDENT",
    },
  });

  const student3 = await db.user.upsert({
    where: { studentId: "6500000003" },
    update: {
      email: "test.student3@dome.tu.ac.th",
      name: "นักศึกษาทดสอบ3",
    },
    create: {
      email: "test.student3@dome.tu.ac.th",
      name: "นักศึกษาทดสอบ3",
      studentId: "6500000003",
      role: "STUDENT",
    },
  });

  console.log("Seeded:", { teacher, teacher2, student, preImportedStudent, student2, student3 });
}

main().catch(console.error).finally(() => db.$disconnect());
