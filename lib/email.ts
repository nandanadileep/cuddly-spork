import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendPasswordResetEmail(params: { to: string; resetUrl: string }) {
    const { to, resetUrl } = params

    if (!resend) {
        // Email provider not configured. In production we shouldn't leak the reset link.
        console.warn('[Email] RESEND_API_KEY not set; skipping password reset email for', to)
        return { skipped: true as const }
    }

    const from = process.env.RESEND_FROM_EMAIL || 'ShipCV <onboarding@resend.dev>'

    await resend.emails.send({
        from,
        to,
        subject: 'Reset your ShipCV password',
        text: `Reset your password using this link (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
        html: `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.5;">
            <h2 style="margin: 0 0 12px;">Reset your ShipCV password</h2>
            <p style="margin: 0 0 12px;">
              Click the button below to reset your password. This link is valid for <strong>1 hour</strong>.
            </p>
            <p style="margin: 18px 0;">
              <a href="${resetUrl}" style="background: #689071; color: #ffffff; padding: 10px 14px; border-radius: 8px; text-decoration: none; display: inline-block;">
                Reset password
              </a>
            </p>
            <p style="margin: 0 0 8px; color: #555;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin: 0 0 18px;">
              <a href="${resetUrl}">${resetUrl}</a>
            </p>
            <p style="margin: 0; color: #777; font-size: 12px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
    })

    return { skipped: false as const }
}

