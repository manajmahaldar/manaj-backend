const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    const brevoApiKey = process.env.BREVO_API_KEY;

    // 1. Resend HTTP API (Bypasses all cloud SMTP blocks)
    if (resendApiKey) {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey.trim()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || 'Monaj Platform <onboarding@resend.dev>',
                    to: [options.email],
                    subject: options.subject,
                    text: options.message,
                    html: options.html,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                console.log(`[Resend API Sent] To: ${options.email} | ID: ${data.id}`);
                return data;
            }
            console.error('[Resend API Error]:', data);
        } catch (err) {
            console.error('[Resend API Fetch Error]:', err.message);
        }
    }

    // 2. Brevo (Sendinblue) HTTP API
    if (brevoApiKey) {
        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': brevoApiKey.trim(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: {
                        name: 'Monaj Platform',
                        email: process.env.EMAIL_USER || 'manojmahaldar10@gmail.com',
                    },
                    to: [{ email: options.email }],
                    subject: options.subject,
                    htmlContent: options.html || options.message,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                console.log(`[Brevo API Sent] To: ${options.email} | MessageId: ${data.messageId}`);
                return data;
            }
            console.error('[Brevo API Error]:', data);
        } catch (err) {
            console.error('[Brevo API Fetch Error]:', err.message);
        }
    }

    // 3. Fallback: Standard Nodemailer Transport
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const user = process.env.EMAIL_USER || 'manojmahaldar10@gmail.com';
    const pass = process.env.EMAIL_PASS || 'hhue cukd zjvp tpqr';
    const port = parseInt(process.env.EMAIL_PORT || '465', 10);
    const secure = port === 465 || host.includes('gmail');

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        service: host.includes('gmail') ? 'gmail' : undefined,
        connectionTimeout: 12000,
        socketTimeout: 12000,
        greetingTimeout: 12000,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
        from: `Monaj Platform <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@monaj.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Nodemailer Email Sent] To: ${options.email} | MessageId: ${info.messageId}`);
    return info;
};

module.exports = sendEmail;
