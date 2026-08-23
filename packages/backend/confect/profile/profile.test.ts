import { expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { asUser, mockUser, setupTest } from "../test/utils";

it("rejects an unauthenticated caller", async () => {
  const t = setupTest();

  await expect(t.query(api.profile.profile.getProfile, {})).rejects.toThrow(
    "@auth/UnauthorizedError"
  );
});

it("returns the profile for a signed-in user", async () => {
  const t = setupTest();
  const { identity, user } = await asUser(t);

  const profile = await user.query(api.profile.profile.getProfile, {});

  expect(profile).toEqual({
    id: identity.subject,
    name: mockUser.name,
    email: mockUser.email,
    emailVerified: mockUser.emailVerified,
    image: mockUser.image,
    createdAt: mockUser.createdAt,
  });
});
