import { EmailData } from "./api";

// Re-export EmailData interface for use in other modules
export type { EmailData };

/**
 * Send a contact form email notification
 */
export async function sendContactFormEmail(data: EmailData): Promise<void> {
  try {
    // For now, this is a placeholder implementation
    // You can replace this with actual email service integration
    console.log("Contact form email would be sent:", {
      to: data.to,
      subject: data.subject,
      body: data.body,
    });

    // TODO: Implement actual email sending logic
    // You can use AWS SES, Resend, SendGrid, or other email services
    // See EMAIL_INTEGRATION.md for implementation examples
  } catch (error) {
    console.error("Failed to send contact form email:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * Send a confirmation email to the user
 */
export async function sendConfirmationEmail(data: EmailData): Promise<void> {
  try {
    // For now, this is a placeholder implementation
    // You can replace this with actual email service integration
    console.log("Confirmation email would be sent:", {
      to: data.to,
      subject: data.subject,
      body: data.body,
    });

    // TODO: Implement actual email sending logic
    // You can use AWS SES, Resend, SendGrid, or other email services
    // See EMAIL_INTEGRATION.md for implementation examples
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
    throw new Error("Failed to send email");
  }
}
