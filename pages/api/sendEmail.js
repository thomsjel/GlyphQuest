import nodemailer from "nodemailer";

export default async (req, res) => {
  if (req.method === "POST") {
    const { email, subject, message } = req.body;

    // Create reusable transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.SENDER_MAIL_SERVER, // Replace with your mail server
      port: 587,
      secure: false, // True for 465, false for other ports
      auth: {
        user: process.env.SENDER_MAIL_ADDRESS, // Replace with your email
        pass: process.env.SENDER_MAIL_PW, // Replace with your password
      },
    });

    try {
      // Send mail with defined transport object
      let info = await transporter.sendMail({
        from: `"GlyphQuest"<${process.env.SENDER_MAIL_ADDRESS}>`, // Sender address
        to: email, // List of receivers
        subject: subject, // Subject line
        text: message, // Plain text body
        html: `<b>${message}</b>`, // HTML body content
      });

      console.log("Message sent: %s", info.messageId);
      res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error("Error sending email: ", error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    // Handle any other HTTP method
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
