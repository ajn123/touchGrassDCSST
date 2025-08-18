# Email Integration Guide

## Current Setup

The contact form is currently set up with simulated email sending. To enable real email functionality, you have several options:

## Option 1: AWS SES (Recommended for SST projects)

1. **Install AWS SES SDK:**
   ```bash
   npm install @aws-sdk/client-ses
   ```

2. **Update the email utility** (`src/lib/email.ts`):
   ```typescript
   import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

   const ses = new SESClient({ region: 'us-east-1' });

   export async function sendContactFormEmail(data: EmailData): Promise<void> {
     try {
       const command = new SendEmailCommand({
         Source: 'your-email@yourdomain.com', // Configure this
         Destination: {
           ToAddresses: ['your-email@yourdomain.com'], // Configure this
         },
         Message: {
           Subject: {
             Data: `New Contact Form Submission: ${data.subject}`,
           },
           Body: {
             Text: {
               Data: `
   New contact form submission received:

   Name: ${data.name}
   Email: ${data.email}
   Subject: ${data.subject}
   Message: ${data.message}

   Timestamp: ${new Date().toISOString()}
               `.trim(),
             },
           },
         },
       });

       await ses.send(command);
       console.log('Contact form email sent successfully');
     } catch (error) {
       console.error('Failed to send contact form email:', error);
       throw new Error('Failed to send email');
     }
   }
   ```

## Option 2: Resend (Modern email API)

1. **Install Resend:**
   ```bash
   npm install resend
   ```

2. **Update the email utility:**
   ```typescript
   import { Resend } from 'resend';

   const resend = new Resend(process.env.RESEND_API_KEY);

   export async function sendContactFormEmail(data: EmailData): Promise<void> {
     try {
       await resend.emails.send({
         from: 'your-email@yourdomain.com', // Configure this
         to: 'your-email@yourdomain.com', // Configure this
         subject: `New Contact Form Submission: ${data.subject}`,
         text: `
   New contact form submission received:

   Name: ${data.name}
   Email: ${data.email}
   Subject: ${data.subject}
   Message: ${data.message}

   Timestamp: ${new Date().toISOString()}
         `.trim(),
       });

       console.log('Contact form email sent successfully');
     } catch (error) {
       console.error('Failed to send contact form email:', error);
       throw new Error('Failed to send email');
     }
   }
   ```

## Option 3: SendGrid

1. **Install SendGrid:**
   ```bash
   npm install @sendgrid/mail
   ```

2. **Update the email utility:**
   ```typescript
   import sgMail from '@sendgrid/mail';

   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

   export async function sendContactFormEmail(data: EmailData): Promise<void> {
     try {
       await sgMail.send({
         to: 'your-email@yourdomain.com', // Configure this
         from: 'your-email@yourdomain.com', // Configure this
         subject: `New Contact Form Submission: ${data.subject}`,
         text: `
   New contact form submission received:

   Name: ${data.name}
   Email: ${data.email}
   Subject: ${data.subject}
   Message: ${data.message}

   Timestamp: ${new Date().toISOString()}
         `.trim(),
       });

       console.log('Contact form email sent successfully');
     } catch (error) {
       console.error('Failed to send contact form email:', error);
       throw new Error('Failed to send email');
     }
   }
   ```

## Environment Variables

Add the appropriate API key to your environment variables:

```env
# For AWS SES (if using AWS credentials)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# For Resend
RESEND_API_KEY=your_resend_api_key

# For SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
```

## SST Email Resource Issues

The SST email resource (`sst.aws.Email`) has some limitations:
- It doesn't automatically create TypeScript bindings like other resources
- The `Resource.Email` pattern doesn't work as expected
- It's primarily designed for simple use cases

For production applications, we recommend using dedicated email services like Resend, SendGrid, or AWS SES directly.

## Testing

To test the email functionality:

1. Fill out the contact form on `/contact`
2. Check the browser console for email logs
3. Check your email service dashboard for sent emails
4. Monitor the API route logs in your terminal 