import { handler } from "@app/server/handler";

const PREFIX = "/api/server";

function handleRequest(req: Request) {
  const url = new URL(req.url);
  url.pathname = url.pathname.slice(PREFIX.length) || "/";
  return handler(new Request(url, req));
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
