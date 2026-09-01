require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function testEmail() {
    try {
        console.log("Host:", process.env.EMAIL_HOST);
        console.log("Port:", process.env.EMAIL_PORT);
        console.log("User:", process.env.EMAIL_USER);
        
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `Monaj Platform <${process.env.EMAIL_FROM}>`,
            to: process.env.EMAIL_USER, // send to self for testing
            subject: "Test Email from MatsyaLink",
            text: "This is a test email to verify SMTP configuration.",
        });

        console.log("Message sent successfully! ID:", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

testEmail();
