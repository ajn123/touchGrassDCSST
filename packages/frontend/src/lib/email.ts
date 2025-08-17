// Email functionality disabled - just logging to console
// import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface EmailData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendContactFormEmail(data: EmailData): Promise<void> {
  // Email functionality disabled - just log the data
  console.log('=== CONTACT FORM EMAIL (DISABLED) ===');
  console.log('To: hi@touchgrassdc.com');
  console.log('Subject: New Contact Form Submission: ' + data.subject);
  console.log('Name: ' + data.name);
  console.log('Email: ' + data.email);
  console.log('Message: ' + data.message);
  console.log('=====================================');
  
  // Simulate successful email sending
  console.log('Contact form email logged successfully (email sending disabled)');
}

export async function sendConfirmationEmail(data: EmailData): Promise<void> {
  // Email functionality disabled - just log the data
  console.log('=== CONFIRMATION EMAIL (DISABLED) ===');
  console.log('To: ' + data.email);
  console.log('Subject: Thank you for contacting TouchGrass DC');
  console.log('Name: ' + data.name);
  console.log('=====================================');
  
  // Simulate successful email sending
  console.log('Confirmation email logged successfully (email sending disabled)');
} 