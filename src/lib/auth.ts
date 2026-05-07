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

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  studentId: true,
} as const;

function mapTuRole(tuUser: TuAuthResponse) {
  // TU API `type` is the source of truth for role.
  // Email domain is only a sanity check in isAcceptableTuUser().
  return tuUser.type === "student" ? Role.STUDENT : Role.TEACHER;
}

function getTuDisplayName(tuUser: TuAuthResponse) {
  return (
    tuUser.displayname_th?.trim() ||
    tuUser.displayname_en?.trim() ||
    normalizeEmail(tuUser.email)
  );
}

function isAcceptableTuUser(tuUser: TuAuthResponse) {
  if (!tuUser.status) return false;
  if (!isAllowedEmail(tuUser.email)) return false;

  // Role does not come from email. These domain checks are defense-in-depth
  // after TU API has already identified the account type.
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
    select: authUserSelect,
  });

  if (!user?.email || !isAllowedEmail(user.email)) return null;

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

  const byEmail = await db.user.findUnique({
    where: { email },
    select: authUserSelect,
  });

  let user = byEmail
    ? await db.user.update({
        where: { id: byEmail.id },
        data: {
          name,
          studentId: role === Role.STUDENT ? studentId : null,
        },
        select: authUserSelect,
      })
    : null;

  if (!user && studentId) {
    const byStudentId = await db.user.findUnique({
      where: { studentId },
      select: authUserSelect,
    });

    if (byStudentId) {
      user = await db.user.update({
        where: { id: byStudentId.id },
        data: { email, name },
        select: authUserSelect,
      });
    }
  }

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name,
        role,
        studentId,
      },
      select: authUserSelect,
    });
  }

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
