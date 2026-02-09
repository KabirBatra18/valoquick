const ADMIN_EMAIL = 'kabirbatra220@gmail.com';

/**
 * Check if an email is the admin email (client-side check)
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

export { ADMIN_EMAIL };
