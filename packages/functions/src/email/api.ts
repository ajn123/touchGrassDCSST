import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { Resource } from "sst";
const PRIMARY_EMAIL = "hi@touchgrassdc.com";

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

export const handler = async (event: any) => {
  try {
    const client = new SESClient();
    const body = JSON.parse(event.body || "{}");

    console.log("Received email request:", body);

    // Handle contact form data
    let emailSubject = "";
    let emailBody = "";
    let replyTo = "";

    if (body.type === "contact-form" && body.data) {
      // Contact form format
      const formData = body.data;
      emailSubject = `New Contact Form Submission: ${formData.subject}`;
      emailBody = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${formData.name || "Not provided"}</p>
        <p><strong>Email:</strong> ${formData.email || "Not provided"}</p>
        <p><strong>Subject:</strong> ${formData.subject || "Not provided"}</p>
        <p><strong>Message:</strong></p>
        <p>${formData.message || "No message provided"}</p>
        <hr>
        <p><em>Submitted at: ${new Date().toISOString()}</em></p>
      `;
      replyTo = formData.email || "";
    } else {
      // Direct email format
      emailSubject = body.subject || "No Subject";
      emailBody = body.body || body.message || "No message content";
      replyTo = body.replyTo || "";
    }

    // Validate required fields
    if (!emailSubject || !emailBody) {
      throw new Error("Subject and message body are required");
    }

    // Check if we're in sandbox mode (unverified emails)
    const isSandboxMode = process.env.SES_SANDBOX_MODE === "true";

    // Use verified email or fallback to sandbox
    const fromEmail = isSandboxMode
      ? process.env.SES_VERIFIED_EMAIL || "noreply@example.com"
      : Resource.hi.sender;

    const toEmail = isSandboxMode
      ? process.env.SES_VERIFIED_EMAIL || "noreply@example.com"
      : PRIMARY_EMAIL;

    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: { Data: emailSubject },
        Body: {
          Html: { Data: emailBody },
        },
      },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
    });

    await client.send(command);

    console.log("Email sent successfully:", {
      to: toEmail,
      subject: emailSubject,
      from: fromEmail,
      replyTo: replyTo,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        success: true,
        message: "Email sent successfully",
      }),
    };
  } catch (error) {
    console.error("Error sending email:", error);

    // Provide more specific error information
    let errorMessage = "Failed to send email";
    if (error instanceof Error) {
      if (error.message.includes("Sender")) {
        errorMessage =
          "Email sender not verified. Please verify your email address in AWS SES.";
      } else if (error.message.includes("Recipient")) {
        errorMessage =
          "Email recipient not verified. Please verify the recipient email address in AWS SES.";
      } else {
        errorMessage = `Email error: ${error.message}`;
      }
    }

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        success: false,
        error: errorMessage,
      }),
    };
  }
};
