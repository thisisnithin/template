import { auth } from "@app/auth";
import { SHAPES } from "@app/server/sync.registry";
import { env } from "@app/shared/env";
import { shapeColumnNames, shapeTableName } from "@app/sync/server";

/** Anything the client sends under these names is discarded, not forwarded. */
const SERVER_OWNED_PARAMS = ["table", "columns", "where", "replica"] as const;

const isClientOwned = (name: string): boolean =>
  !(
    SERVER_OWNED_PARAMS.some((owned) => owned === name) ||
    name.startsWith("params[") ||
    name.startsWith("api_secret")
  );

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ shape: string }> }
) => {
  const { shape: shapeName } = await params;
  const definition = SHAPES[shapeName];

  if (definition === undefined) {
    return new Response("Not found", { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const scope = definition.scope(session.user.id);

  if (scope === null) {
    return new Response("Forbidden", { status: 403 });
  }

  const incoming = new URL(request.url);
  const shape = new URL("/v1/shape", env.ELECTRIC_URL);

  for (const [name, value] of incoming.searchParams) {
    if (isClientOwned(name)) {
      shape.searchParams.append(name, value);
    }
  }

  shape.searchParams.set("table", shapeTableName(definition));
  shape.searchParams.set("columns", shapeColumnNames(definition).join(","));
  // Parameterised rather than interpolated: these are values, not SQL.
  shape.searchParams.set("where", scope.where);
  scope.params.forEach((value, index) => {
    shape.searchParams.set(`params[${index + 1}]`, value);
  });

  const response = await fetch(shape, { cache: "no-store" });

  // Streaming the body through while keeping the original encoding headers
  // would make the client decode a compressed response twice.
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");

  return new Response(response.body, { status: response.status, headers });
};
