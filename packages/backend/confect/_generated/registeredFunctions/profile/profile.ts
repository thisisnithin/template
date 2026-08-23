import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../../schema";
import profile from "../../../profile/profile.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../../profile/profile.spec")["default"]>(databaseSchema, profile, RegisteredConvexFunction.make);
