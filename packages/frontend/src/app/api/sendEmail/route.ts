import { NextRequest, NextResponse } from 'next/server';
import { sendContactFormEmail, sendConfirmationEmail, EmailData } from '@/lib/email';
const PRIMARY_EMAIL = 'hi@touchgrassdc.com';

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

interface ContactFormEmail {
  name: string;
  email: string;
  subject: string;
  message: string;
}

async function sendEmail(emailData: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}) {
  try {
    // Use the Lambda function URL for sending emails
    const response = await fetch(process.env.SEND_EMAIL_URL || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`Email service returned ${response.status}`);
    }

    console.log('Direct email sent successfully to:', emailData.to);
  } catch (error) {
    console.error('Error sending direct email:', error);
    throw error;
  }
}

async function handleContactForm(data: { name: string; email: string; subject: string; message: string }) {
  try {
    // Validate required fields
    if (!data.name || !data.email || !data.subject || !data.message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate message length
    if (data.message.length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Send notification email to admin
    await sendContactFormEmail(data);

    // Send confirmation email to user
    await sendConfirmationEmail(data);

    return NextResponse.json(
      { 
        message: 'Thank you for your message! We\'ll get back to you as soon as possible.',
        success: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing contact form:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send email. Please try again later.',
        success: false 
      },
      { status: 500 }
    );
  }
}

async function handleDirectEmail(data: { to: string; subject: string; body: string; from?: string; replyTo?: string }) {
  try {
    // Validate required fields
    if (!data.to || !data.subject || !data.body) {
      return NextResponse.json(
        { error: 'to, subject, and body are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.to)) {
      return NextResponse.json(
        { error: 'Invalid recipient email format' },
        { status: 400 }
      );
    }

    // Send the email
    await sendEmail({
      to: data.to,
      subject: data.subject,
      body: data.body,
      from: data.from || PRIMARY_EMAIL,
      replyTo: data.replyTo
    });

    return NextResponse.json(
      { 
        message: 'Email sent successfully',
        success: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending direct email:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send email. Please try again later.',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if it's a contact form submission or direct email
    if (body.type === 'contact-form') {
      return await handleContactForm(body.data as { name: string; email: string; subject: string; message: string });
    } else {
      return await handleDirectEmail(body as { to: string; subject: string; body: string; from?: string; replyTo?: string });
    }
    
  } catch (error) {
    console.error('Error in sendEmail API:', error);
    
    return NextResponse.json(
      { 
        error: 'Invalid request format',
        success: false 
      },
      { status: 400 }
    );
  }
} 