// SPDX-License-Identifier: BUSL-1.1

/**
 * Edge Functions — Main Service Entry Point
 *
 * Required by supabase/edge-runtime as the `--main-service` handler.
 * Provides a minimal health-check responder and routes requests.
 *
 * Issues: #1246
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

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
