import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { consumeLoginOtp } from "@/lib/login-otp";
import { verifyPassword } from "@/lib/password";
import type { Permission } from "@/lib/rbac/permissions";
import {
  backfillUserRoles,
  digestIp,
  getUserPermissionSet,
  userHasPermission,
} from "@/lib/rbac/roles";

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email password and OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          await writeAuditLog({
            actorType: "system",
            action: "auth.login_failed",
            metadata: { reason: "invalid_payload" },
          });
          return null;
        }

        try {
          const roleCount = await db.role.count();
          if (roleCount === 0) {
            await backfillUserRoles();
          }
        } catch (error) {
          console.error("role backfill failed during login:", error);
        }

        let user: {
          id: string;
          email: string;
          passwordHash: string;
          role: string;
          disabledAt: Date | null;
          sessionVersion: number;
          roleRef: { slug: string } | null;
        } | null = null;

        try {
          user = await db.user.findUnique({
            where: { email: parsed.data.email },
            include: {
              roleRef: { select: { slug: true } },
            },
          });
        } catch (error) {
          console.error("login user lookup failed (database unreachable?):", error);
          return null;
        }

        const passwordOk = await verifyPassword(
          parsed.data.password,
          user?.passwordHash ?? TIMING_EQUALIZER_HASH
        );

        if (!user || !passwordOk || user.disabledAt) {
          await writeAuditLog({
            actorType: "system",
            action: "auth.login_failed",
            metadata: { email: parsed.data.email },
          });
          return null;
        }

        const otpResult = await consumeLoginOtp({
          userId: user.id,
          code: parsed.data.otp,
        });
        if (!otpResult.ok) {
          return null;
        }

        const roleSlug = user.roleRef?.slug ?? user.role;
        if (!roleSlug) {
          await writeAuditLog({
            actorType: "system",
            action: "auth.login_failed",
            metadata: { email: parsed.data.email, reason: "no_role" },
          });
          return null;
        }

        await writeAuditLog({
          actorType: "user",
          actorUserId: user.id,
          action: "auth.login_success",
          resourceType: "User",
          resourceId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          role: roleSlug,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.sessionVersion = token.sessionVersion ?? 0;
      }
      return session;
    },
  },
};

/** Valid scrypt hash of a random value, so unknown emails cost the same as wrong passwords. */
const TIMING_EQUALIZER_HASH =
  "scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export class CxAuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "CxAuthError";
  }
}

export class CxPermissionError extends Error {
  constructor(public permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "CxPermissionError";
  }
}

export async function requireCxUser(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) {
    throw new CxAuthError();
  }
  const account = await db.user.findUnique({
    where: { id: session.user.id },
    select: { disabledAt: true, sessionVersion: true },
  });
  if (
    !account ||
    !isSessionCurrent({
      disabledAt: account.disabledAt,
      storedVersion: account.sessionVersion,
      tokenVersion: session.user.sessionVersion,
    })
  ) {
    throw new CxAuthError();
  }
  return session;
}

export function isSessionCurrent(input: {
  disabledAt: Date | null;
  storedVersion: number;
  tokenVersion: number | undefined;
}) {
  if (input.disabledAt) return false;
  return (input.tokenVersion ?? 0) === input.storedVersion;
}

export async function requirePermission(
  permission: Permission
): Promise<Session> {
  const session = await requireCxUser();
  const allowed = await userHasPermission(session.user.id, permission);
  if (!allowed) {
    throw new CxPermissionError(permission);
  }
  return session;
}

export async function requireAnyPermission(
  permissions: Permission[]
): Promise<Session> {
  const session = await requireCxUser();
  const set = await getUserPermissionSet(session.user.id);
  const matched = permissions.find((permission) => set.has(permission));
  if (!matched) {
    throw new CxPermissionError(permissions[0]!);
  }
  return session;
}

export async function getSessionPermissions(
  session?: Session | null
): Promise<Permission[]> {
  const active = session ?? (await getServerSession(authOptions));
  if (!active?.user?.id) return [];
  const set = await getUserPermissionSet(active.user.id);
  return [...set];
}

export function isCxAuthError(error: unknown): boolean {
  return error instanceof CxAuthError;
}

export function isCxPermissionError(error: unknown): boolean {
  return error instanceof CxPermissionError;
}

export { digestIp };
