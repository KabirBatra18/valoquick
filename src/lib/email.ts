import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const ADMIN_EMAIL = 'kabirbatra220@gmail.com';
const FROM_EMAIL = 'ValuQuick <notifications@valuquick.in>';

interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send email notification to admin
 */
async function sendAdminEmail(subject: string, html: string): Promise<EmailResult> {
  const client = getResend();
  if (!client) {
    console.log('RESEND_API_KEY not set, skipping email');
    return { success: false, error: 'API key not configured' };
  }

  try {
    await client.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Notify admin of new subscription
 */
export async function notifyNewSubscription(
  firmName: string,
  plan: string,
  amount: number,
  ownerEmail: string
): Promise<EmailResult> {
  const subject = `New Subscription: ${firmName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">New Subscription</h2>
      <p>A new subscription has been activated!</p>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Firm:</strong> ${firmName}</p>
        <p style="margin: 4px 0;"><strong>Plan:</strong> ${plan}</p>
        <p style="margin: 4px 0;"><strong>Amount:</strong> ₹${amount.toLocaleString('en-IN')}</p>
        <p style="margin: 4px 0;"><strong>Owner:</strong> ${ownerEmail}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        <a href="https://valuquick.in/admin" style="color: #6366f1;">View in Admin Dashboard</a>
      </p>
    </div>
  `;

  return sendAdminEmail(subject, html);
}

/**
 * Notify admin of subscription cancellation
 */
export async function notifySubscriptionCancelled(
  firmName: string,
  plan: string,
  ownerEmail: string,
  reason?: string
): Promise<EmailResult> {
  const subject = `Subscription Cancelled: ${firmName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">Subscription Cancelled</h2>
      <p>A subscription has been cancelled.</p>

      <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Firm:</strong> ${firmName}</p>
        <p style="margin: 4px 0;"><strong>Plan:</strong> ${plan}</p>
        <p style="margin: 4px 0;"><strong>Owner:</strong> ${ownerEmail}</p>
        ${reason ? `<p style="margin: 4px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        <a href="https://valuquick.in/admin" style="color: #6366f1;">View in Admin Dashboard</a>
      </p>
    </div>
  `;

  return sendAdminEmail(subject, html);
}

/**
 * Notify admin of high abuse activity
 */
export async function notifyAbuseAlert(
  ipPrefix: string,
  attemptCount: number,
  linkedFirms: string[]
): Promise<EmailResult> {
  const subject = `Abuse Alert: Multiple trials from ${ipPrefix}.*`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Abuse Alert</h2>
      <p>Potential trial abuse detected from the same network.</p>

      <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>IP Prefix:</strong> ${ipPrefix}.*</p>
        <p style="margin: 4px 0;"><strong>Attempts:</strong> ${attemptCount}</p>
        <p style="margin: 4px 0;"><strong>Linked Firms:</strong> ${linkedFirms.length}</p>
        ${linkedFirms.length > 0 ? `<p style="margin: 4px 0; font-size: 12px; color: #6b7280;">${linkedFirms.join(', ')}</p>` : ''}
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        <a href="https://valuquick.in/admin" style="color: #6366f1;">Review in Admin Dashboard</a>
      </p>
    </div>
  `;

  return sendAdminEmail(subject, html);
}

/**
 * Notify admin of new firm registration
 */
export async function notifyNewFirm(
  firmName: string,
  ownerEmail: string
): Promise<EmailResult> {
  const subject = `New Firm: ${firmName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">New Firm Registered</h2>
      <p>A new firm has been created on ValuQuick.</p>

      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Firm:</strong> ${firmName}</p>
        <p style="margin: 4px 0;"><strong>Owner:</strong> ${ownerEmail}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        <a href="https://valuquick.in/admin" style="color: #6366f1;">View in Admin Dashboard</a>
      </p>
    </div>
  `;

  return sendAdminEmail(subject, html);
}
