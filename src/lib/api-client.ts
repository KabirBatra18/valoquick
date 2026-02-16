'use client';

import { auth } from './firebase';
import { getLocalSessionId } from './auth';

/**
 * Get the current user's ID token for API authentication
 * Forces refresh to ensure token is valid
 */
export async function getAuthToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) {
    return null;
  }

  try {
    // Force refresh to ensure we have a valid token
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Get headers with authentication token
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make an authenticated API request
 * Includes session ID for single-device enforcement
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const sessionId = getLocalSessionId();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Include session ID for single-device validation
  if (sessionId) {
    (headers as Record<string, string>)['X-Session-Id'] = sessionId;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
