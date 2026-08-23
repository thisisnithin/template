import { FunctionSpec } from "@confect/core";
import { Schema } from "effect";
import { AppGroupSpec } from "../app/app";
import { RequireUser } from "../auth/auth.middleware";
import { ProfileNotFoundError } from "./profile.errors";
import { Profile } from "./profile.types";

export default AppGroupSpec.make().addFunction(
  FunctionSpec.publicQuery({
    name: "getProfile",
    args: () => Schema.Struct({}),
    returns: () => Profile,
    error: () => ProfileNotFoundError,
  }).middleware(RequireUser)
);
