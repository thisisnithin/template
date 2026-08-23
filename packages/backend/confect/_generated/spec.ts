import { GroupSpec, Spec } from "@confect/core";
import email_email from "../email/email.spec";
import health_health from "../health/health.spec";
import profile_profile from "../profile/profile.spec";

const spec: Spec.Spec<
  | GroupSpec.NamedAt<GroupSpec.GroupSpec<"Convex", "email", never, GroupSpec.NamedAt<typeof email_email, "email">>, "email">
  | GroupSpec.NamedAt<GroupSpec.GroupSpec<"Convex", "health", never, GroupSpec.NamedAt<typeof health_health, "health">>, "health">
  | GroupSpec.NamedAt<GroupSpec.GroupSpec<"Convex", "profile", never, GroupSpec.NamedAt<typeof profile_profile, "profile">>, "profile">
> = Spec.make().addAt("email", GroupSpec.makeAt("email").addGroupAt("email", email_email)).addAt("health", GroupSpec.makeAt("health").addGroupAt("health", health_health)).addAt("profile", GroupSpec.makeAt("profile").addGroupAt("profile", profile_profile));

export default spec;
