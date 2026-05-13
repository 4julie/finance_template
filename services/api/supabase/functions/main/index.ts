// SPDX-License-Identifier: BUSL-1.1

/**
 * Edge Functions — Main Service Entry Point
 *
 * Required by supabase/edge-runtime as the `--main-service` handler.
 * Provides a minimal health-check responder and routes requests.
 *
 * Uses native Deno.serve() — no URL imports needed at boot time.
 *
 * Issues: #1246
 */

Deno.serve((_req: Request): Response => {
  const url = new URL(_req.url);

  // Health check for the edge-runtime itself
  if (url.pathname === '/health-check' || url.pathname === '/') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
});
