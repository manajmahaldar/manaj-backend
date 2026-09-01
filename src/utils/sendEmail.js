const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const isGmail = process.env.EMAIL_HOST?.includes('gmail');

    const transporter = nodemailer.createTransport(
        isGmail
            ? {
                  service: 'gmail',
                  auth: {
                      user: process.env.EMAIL_USER,
                      pass: process.env.EMAIL_PASS,
                  },
              }
            : {
                  host: process.env.EMAIL_HOST,
                  port: parseInt(process.env.EMAIL_PORT || '587', 10),
                  secure: process.env.EMAIL_PORT === '465',
                  auth: {
                      user: process.env.EMAIL_USER,
                      pass: process.env.EMAIL_PASS,
                  },
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
