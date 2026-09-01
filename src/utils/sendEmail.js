const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const user = process.env.EMAIL_USER || 'manojmahaldar10@gmail.com';
    const pass = process.env.EMAIL_PASS || 'hhue cukd zjvp tpqr';
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);

    const isGmail = host.includes('gmail');

    const transporter = nodemailer.createTransport(
        isGmail
            ? {
                  service: 'gmail',
                  connectionTimeout: 10000,
                  socketTimeout: 10000,
                  greetingTimeout: 10000,
                  auth: { user, pass },
              }
            : {
                  host,
                  port,
                  secure: port === 465,
                  connectionTimeout: 10000,
                  socketTimeout: 10000,
                  greetingTimeout: 10000,
                  auth: { user, pass },
              }
    );

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
