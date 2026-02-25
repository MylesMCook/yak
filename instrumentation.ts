// Instrumentation hook — no-op for self-hosted deployment.
// Remove @vercel/otel to avoid sending telemetry to Vercel.
export function register() {}
