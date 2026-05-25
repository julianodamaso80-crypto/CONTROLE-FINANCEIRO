import { google } from 'googleapis';
import { config } from '../config.js';

let cachedClient: ReturnType<typeof google.auth.OAuth2.prototype.constructor> | null = null;

export function getOAuthClient() {
  if (cachedClient) return cachedClient;
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google OAuth credentials not configured');
  }
  const client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground',
  );
  client.setCredentials({ refresh_token: config.GOOGLE_REFRESH_TOKEN });
  cachedClient = client;
  return client;
}
