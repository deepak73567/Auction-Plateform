import nodeMailer from "nodemailer";

export const sendEmail = async ({ email, subject, message }) => {
  try {
    const transporter = nodeMailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // usually true for port 465 (SSL), false for 587 (TLS)
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      logger: true,   // optional, logs to console
      debug: true     // optional, shows full SMTP communication
    });

    const mailOptions = {
      from: `"Auction Platform" <${process.env.SMTP_MAIL}>`,
      to: email,
      subject,
      text: message,
      html: `<div style="font-family:sans-serif;font-size:15px;"><p>${message}</p></div>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending email:", error.message || error);
  }
};

