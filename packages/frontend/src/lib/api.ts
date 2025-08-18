"use server";

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Send a direct email using the API
 */
export async function sendEmail(emailData: EmailData): Promise<ApiResponse> {
  try {
    const response = await fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to send email",
      };
    }

    return {
      success: true,
      message: result.message,
      data: result,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: "Network error occurred",
    };
  }
}

/**
 * Submit a contact form using the API
 */
export async function submitContactForm(
  formData: ContactFormData
): Promise<ApiResponse> {
  try {
    const response = await fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "contact-form",
        data: formData,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to submit contact form",
      };
    }

    return {
      success: true,
      message: result.message,
      data: result,
    };
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return {
      success: false,
      error: "Network error occurred",
    };
  }
}

/**
 * Send a notification email (utility function)
 */
export async function sendNotification(
  to: string,
  subject: string,
  message: string,
  options?: { from?: string; replyTo?: string }
): Promise<ApiResponse> {
  return sendEmail({
    to,
    subject,
    body: message,
    from: options?.from,
    replyTo: options?.replyTo,
  });
}

/**
 * Send a welcome email
 */
export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<ApiResponse> {
  return sendEmail({
    to,
    subject: "Welcome to TouchGrass DC!",
    body: `🎉 WELCOME TO TOUCHGRASS DC!

Dear ${name},

Welcome to TouchGrass DC! We're excited to have you join our community.

🚀 WHAT'S NEXT?
================
We'll keep you updated on upcoming events and activities in the DC area.

📧 STAY CONNECTED
==================
Feel free to reach out if you have any questions or suggestions.

---
Best regards,
The TouchGrass DC Team`.trim(),
  });
}

/**
 * Send an event reminder email
 */
export async function sendEventReminder(
  to: string,
  name: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string
): Promise<ApiResponse> {
  return sendEmail({
    to,
    subject: `Reminder: ${eventTitle} tomorrow!`,
    body: `⏰ EVENT REMINDER

Dear ${name},

This is a friendly reminder about tomorrow's event:

📅 EVENT DETAILS
================
Event: ${eventTitle}
Date: ${eventDate}
Location: ${eventLocation}

🎯 DON'T FORGET!
================
We look forward to seeing you there!

---
Best regards,
The TouchGrass DC Team`.trim(),
  });
}
