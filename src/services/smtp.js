import twilio from "twilio";
import { createTransport } from "nodemailer";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


export async function sendSMS(to, body) {
    try {
        const { sid } = await client.messages.create({
            body,
            from: process.env.SMS_from_number,
            to
        });

        return !!sid;
    } catch (error) {
        console.error("Error sending message:", error);
        return false;
    }
}




const transporter = createTransport({
  host: "server252.web-hosting.com", 
  port: 465, 
  secure: true, 
  auth: {
    user: process.env.SMTP_user, 
    pass: process.env.SMTP_pass, 
  },
});


export async function sendMail({ to, subject, text, html = null } = {}) {
 
    try {

        const info = await transporter.sendMail({
            from: process.env.SMTP_user,
            to,
            subject,
            text,
            html,
        });
    

        return true;
    } catch (error) {
     
        return false;
    }
}
