const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const brevoApiKey = process.env.BREVO_API_KEY;

    // 1. Brevo (Sendinblue) HTTP API — 100% Reliable over HTTPS (Port 443)
    if (brevoApiKey && brevoApiKey.trim()) {
        try {
            const senderEmail = process.env.EMAIL_USER || 'manojmahaldar10@gmail.com';
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': brevoApiKey.trim(),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    sender: {
                        name: 'Monaj Platform',
                        email: senderEmail
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

    // 2. Fallback: Gmail Nodemailer Transport (Localhost)
    const user = process.env.EMAIL_USER || 'manojmahaldar10@gmail.com';
    const rawPass = process.env.EMAIL_PASS || 'hhue cukd zjvp tpqr';
    const pass = rawPass.replace(/\s+/g, ''); // strip spaces from App Password

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user.trim(),
            pass: pass
        }
    });

    const mailOptions = {
        from: `Monaj Platform <${user.trim()}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Gmail Sent] To: ${options.email} | MessageId: ${info.messageId}`);
    return info;
};

module.exports = sendEmail;
