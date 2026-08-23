import { RegisteredConvexFunction, RegisteredFunctions } from "@confect/server";
import databaseSchema from "../../schema";
import health from "../../../health/health.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../../health/health.spec")["default"]>(databaseSchema, health, RegisteredConvexFunction.make);
