const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
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
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: `Monaj Platform <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@monaj.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] To: ${options.email} | MessageId: ${info.messageId}`);
    return info;
};

module.exports = sendEmail;
