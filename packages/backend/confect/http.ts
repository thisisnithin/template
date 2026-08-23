import { httpActionGeneric, httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth/better-auth.client";
import { resendComponent } from "./email/resend.client";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpActionGeneric((ctx, request) =>
    resendComponent.handleResendEventWebhook(ctx, request)
  ),
});

export default http;
