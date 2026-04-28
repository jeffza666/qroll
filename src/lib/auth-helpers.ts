import "server-only";

import { Role } from "@prisma/client";

import { auth } from "@/lib/auth";

export class AuthError extends Error {
  constructor(public code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}

export async function requireAuth() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED");
  }

  return session.user;
}

export async function requireTeacher() {
  const user = await requireAuth();

  if (user.role !== Role.TEACHER) {
    throw new AuthError("FORBIDDEN");
  }

  return user;
}

export async function requireStudent() {
  const user = await requireAuth();

  if (user.role !== Role.STUDENT) {
    throw new AuthError("FORBIDDEN");
  }

  return user;
}
