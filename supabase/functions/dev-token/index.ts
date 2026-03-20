import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const secret = Deno.env.get('POWERSYNC_JWT_SECRET');
    const powersyncUrl = Deno.env.get('POWERSYNC_URL');

    if (!secret || !powersyncUrl) {
      return errorResponse('Missing POWERSYNC_JWT_SECRET or POWERSYNC_URL', 500);
    }

    const key = jose.base64url.decode(secret);

    const expiresIn = 12 * 60 * 60; // 12 hours
    const now = Math.floor(Date.now() / 1000);

    const token = await new jose.SignJWT({
      sub: DEMO_USER_ID,
      aud: powersyncUrl,
    })
      .setProtectedHeader({ alg: 'HS256', kid: 'demo-key' })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .sign(key);

    return jsonResponse({
      token,
      expires_at: (now + expiresIn) * 1000, // milliseconds for JS Date
      user_id: DEMO_USER_ID,
    });
  } catch (error) {
    console.error('dev-token error:', error);
    return errorResponse('Failed to generate token', 500);
  }
});
