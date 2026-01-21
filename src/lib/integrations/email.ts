import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@chipin.co.za';
const fromName = process.env.RESEND_FROM_NAME ?? 'ChipIn';

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required');
  }

  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}
