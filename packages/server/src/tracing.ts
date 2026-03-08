import * as OtelResource from "@effect/opentelemetry/Resource";
import * as OtelTracer from "@effect/opentelemetry/Tracer";
import { Layer } from "effect";

export const TracingLayer = OtelTracer.layerGlobal.pipe(
  Layer.provide(OtelResource.layer({ serviceName: "server" }))
);
