import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

const ALLOWED_DOMAINS = new Set(["dome.tu.ac.th", "tu.ac.th"]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getEmailDomain(email: string) {
  return normalizeEmail(email).split("@")[1] ?? "";
}

export function isAllowedEmail(email: string) {
  return ALLOWED_DOMAINS.has(getEmailDomain(email));
}

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    signIn({ user }) {
      return Boolean(user.email && isAllowedEmail(user.email));
    },
    jwt({ token, user }) {
      if (user) {
        const qrollUser = user as {
          id: string;
          role: Role;
          studentId: string | null;
        };
        token.id = qrollUser.id;
        token.role = qrollUser.role;
        token.studentId = qrollUser.studentId;
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.studentId = token.studentId as string | null;

      return session;
    },
  },
} satisfies NextAuthConfig;
