import { FunctionSpec } from "@confect/core";
import { Schema } from "effect";
import { AppGroupSpec } from "../app/app";

export default AppGroupSpec.make().addFunction(
  FunctionSpec.publicQuery({
    name: "check",
    args: () => Schema.Struct({}),
    returns: () => Schema.Struct({ status: Schema.String }),
  })
);
