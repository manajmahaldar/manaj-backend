const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
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
