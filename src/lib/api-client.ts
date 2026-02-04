'use client';

import { auth } from './firebase';

/**
 * Get the current user's ID token for API authentication
 * Forces refresh to ensure token is valid
 */
export async function getAuthToken(): Promise<string | null> {
  const user = auth?.currentUser;
  if (!user) {
    console.warn('getAuthToken: No current user. Auth initialized:', !!auth);
    return null;
  }

  try {
    // Force refresh to ensure we have a valid token
    const token = await user.getIdToken(true);
    console.log('getAuthToken: Got fresh token for user', user.uid, 'Token length:', token.length);
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
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    console.log('authenticatedFetch: Sending request to', url, 'with auth token');
  } else {
    console.warn('authenticatedFetch: No token available, sending unauthenticated request to', url);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
