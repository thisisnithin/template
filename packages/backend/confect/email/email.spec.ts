import { Email } from "@app/shared/email";
import { FunctionSpec } from "@confect/core";
import { Schema } from "effect";
import { AppGroupSpec } from "../app/app";

export default AppGroupSpec.makeNode().addFunction(
  FunctionSpec.internalNodeAction({
    name: "sendWelcome",
    args: () =>
      Schema.Struct({
        to: Email,
        name: Schema.String,
      }),
    returns: () => Schema.Null,
  })
);
