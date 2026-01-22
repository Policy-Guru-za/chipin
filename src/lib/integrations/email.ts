import { Resend } from 'resend';

const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@chipin.co.za';
const fromName = process.env.RESEND_FROM_NAME ?? 'ChipIn';

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export async function sendEmail(payload: EmailPayload) {
  const resend = getResendClient();

  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}
