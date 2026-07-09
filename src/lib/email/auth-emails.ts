import { getResendClient } from "@/lib/resend/client";

interface AuthEmailInput {
  to: string;
  actionLink: string;
}

interface InviteEmailInput extends AuthEmailInput {
  accountName: string;
}

export function canSendBrandedAuthEmail(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function authEmailFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured.");
  }

  return from.includes("<") ? from : `Vesperwise <${from}>`;
}

function renderAuthEmail({
  title,
  eyebrow,
  body,
  buttonLabel,
  actionLink,
  footer,
}: {
  title: string;
  eyebrow: string;
  body: string;
  buttonLabel: string;
  actionLink: string;
  footer: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#050505;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;margin:0;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#0b0b0b;border:1px solid #242424;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:34px 34px 16px;">
                <div style="font-size:22px;font-weight:800;letter-spacing:-0.04em;color:#ffffff;">
                  VESPER<span style="background:#d7ff00;color:#050505;padding:2px 4px;">WISE</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 10px;">
                <p style="margin:0;color:#d7ff00;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;">${eyebrow}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 12px;">
                <h1 style="margin:0;color:#ffffff;font-size:32px;line-height:1.12;letter-spacing:-0.04em;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 26px;">
                <p style="margin:0;color:#a3a3a3;font-size:16px;line-height:1.65;">${body}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 30px;">
                <a href="${actionLink}" style="display:inline-block;background:#d7ff00;color:#050505;text-decoration:none;font-size:15px;font-weight:800;border-radius:14px;padding:14px 20px;">${buttonLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 28px;">
                <p style="margin:0;color:#737373;font-size:13px;line-height:1.55;">
                  If the button does not work, copy and paste this link into your browser:<br>
                  <a href="${actionLink}" style="color:#d7ff00;word-break:break-all;">${actionLink}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#080808;border-top:1px solid #202020;padding:22px 34px;">
                <p style="margin:0;color:#666666;font-size:12px;line-height:1.5;">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendSignupConfirmationEmail({
  to,
  actionLink,
}: AuthEmailInput): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: authEmailFromAddress(),
    to,
    subject: "Confirm your Vesperwise email",
    html: renderAuthEmail({
      title: "Confirm your email address",
      eyebrow: "Account setup",
      body: "Welcome to VesperwiseCRM. Confirm this email address to finish setting up your account and open your workspace.",
      buttonLabel: "Confirm email",
      actionLink,
      footer: "If you did not create a Vesperwise account, you can safely ignore this email.",
    }),
    text: [
      "Confirm your Vesperwise email",
      "",
      "Welcome to VesperwiseCRM. Confirm this email address to finish setting up your account.",
      "",
      actionLink,
      "",
      "If you did not create a Vesperwise account, you can safely ignore this email.",
    ].join("\n"),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendClientPortalInvitationEmail({
  to,
  actionLink,
  accountName,
}: InviteEmailInput): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: authEmailFromAddress(),
    to,
    subject: `${accountName} invited you to view your properties`,
    html: renderAuthEmail({
      title: "You're invited to your property portal",
      eyebrow: "Client portal",
      body: `${accountName} invited you to a portal where you can review properties sourced for you, leave comments, and mark your interest.`,
      buttonLabel: "Open portal",
      actionLink,
      footer: "If you were not expecting this invitation, you can safely ignore this email.",
    }),
    text: [
      `${accountName} invited you to view your properties`,
      "",
      `${accountName} invited you to a portal where you can review properties sourced for you.`,
      "",
      actionLink,
      "",
      "If you were not expecting this invitation, you can safely ignore this email.",
    ].join("\n"),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendTeamInvitationEmail({
  to,
  actionLink,
  accountName,
}: InviteEmailInput): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: authEmailFromAddress(),
    to,
    subject: `You are invited to ${accountName} on Vesperwise`,
    html: renderAuthEmail({
      title: "You are invited to Vesperwise",
      eyebrow: "Team invitation",
      body: `You have been invited to join ${accountName} in VesperwiseCRM. Accept the invitation to collaborate on leads, follow-ups, and team workflows.`,
      buttonLabel: "Accept invitation",
      actionLink,
      footer: "If you were not expecting this invitation, you can safely ignore this email.",
    }),
    text: [
      `You are invited to ${accountName} on Vesperwise`,
      "",
      `You have been invited to join ${accountName} in VesperwiseCRM.`,
      "",
      actionLink,
      "",
      "If you were not expecting this invitation, you can safely ignore this email.",
    ].join("\n"),
  });

  if (error) {
    throw new Error(error.message);
  }
}
