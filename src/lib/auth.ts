import "server-only";

import NextAuth, { type User as AuthUser } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { z } from "zod";

import { authConfig, getEmailDomain, isAllowedEmail, normalizeEmail } from "@/lib/auth-config";
import { db } from "@/lib/db";

const DEFAULT_TU_API_URL = "https://restapi.tu.ac.th/api/v1/auth/Ad/verify";

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const tuAuthResponseSchema = z
  .object({
    status: z.boolean(),
    message: z.string().optional(),
    type: z.enum(["student", "employee"]),
    username: z.string().trim().min(1),
    email: z.string().email(),
    tu_status: z.string().optional(),
    displayname_en: z.string().optional(),
    displayname_th: z.string().optional(),
    StatusWork: z.string().optional(),
    StatusEmp: z.string().optional(),
  })
  .passthrough();

type QrollAuthUser = AuthUser & {
  role: Role;
  studentId: string | null;
};

type TuAuthResponse = z.infer<typeof tuAuthResponseSchema>;

function mapTuRole(tuUser: TuAuthResponse) {
  return tuUser.type === "student" ? Role.STUDENT : Role.TEACHER;
}

function getTuDisplayName(tuUser: TuAuthResponse) {
  return (
    tuUser.displayname_en?.trim() ||
    tuUser.displayname_th?.trim() ||
    normalizeEmail(tuUser.email)
  );
}

function isAcceptableTuUser(tuUser: TuAuthResponse) {
  if (!tuUser.status) return false;
  if (!isAllowedEmail(tuUser.email)) return false;

  const domain = getEmailDomain(tuUser.email);
  if (tuUser.type === "student") {
    return domain === "dome.tu.ac.th" && tuUser.tu_status === "ปกติ";
  }

  return domain === "tu.ac.th";
}

async function callTuApi(username: string, password: string) {
  const apiUrl = process.env.TU_API_URL || DEFAULT_TU_API_URL;
  const apiKey = process.env.TU_API_KEY;

  if (!apiKey) return null;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Application-Key": apiKey,
    },
    body: JSON.stringify({ UserName: username, PassWord: password }),
    cache: "no-store",
  });

  if (!response.ok) return null;

  const raw = await response.json().catch(() => null);
  const parsed = tuAuthResponseSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}

async function authorizeBypass(username: string): Promise<QrollAuthUser | null> {
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(username) },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      studentId: true,
    },
  });

  if (!user || !isAllowedEmail(user.email)) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    studentId: user.studentId,
  };
}

async function authorizeTuUser(
  username: string,
  password: string,
): Promise<QrollAuthUser | null> {
  const tuUser = await callTuApi(username, password);

  if (!tuUser || !isAcceptableTuUser(tuUser)) return null;

  const email = normalizeEmail(tuUser.email);
  const role = mapTuRole(tuUser);
  const name = getTuDisplayName(tuUser);
  const studentId = role === Role.STUDENT ? tuUser.username : null;

  const user = await db.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      role,
      studentId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      studentId: true,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    studentId: user.studentId,
  };
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        if (process.env.BYPASS_TU_AUTH === "true") {
          return authorizeBypass(username);
        }

        return authorizeTuUser(username, password);
      },
    }),
  ],
});
