import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import { convexTest } from "convex-test";
import { components } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

export type TestConvex = ReturnType<typeof convexTest>;

export const setupTest = (): TestConvex => {
  const t = convexTest(schema, modules);
  registerBetterAuth(t);
  return t;
};

export const mockUser = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  emailVerified: true,
  image: "https://example.com/ada.png",
  createdAt: 1_700_000_000_000,
} as const;

export type MockUser = typeof mockUser;

export const seedUser = async (
  t: TestConvex,
  overrides: Partial<MockUser> = {}
) =>
  await t.run(async (ctx) => {
    const data = { ...mockUser, ...overrides };

    const user = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: { ...data, updatedAt: data.createdAt },
      },
    });

    const session = await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "session",
          data: {
            userId: user._id,
            token: `test-session-${user._id}`,
            expiresAt: Date.now() + 60 * 60 * 1000,
            createdAt: data.createdAt,
            updatedAt: data.createdAt,
          },
        },
      }
    );

    return { subject: user._id, sessionId: session._id };
  });

export const asUser = async (
  t: TestConvex,
  overrides: Partial<MockUser> = {}
) => {
  const identity = await seedUser(t, overrides);
  return { identity, user: t.withIdentity(identity) };
};
