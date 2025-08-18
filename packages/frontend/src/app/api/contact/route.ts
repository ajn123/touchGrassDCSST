import { NextRequest, NextResponse } from 'next/server';
import { sendContactFormEmail, sendConfirmationEmail, EmailData } from '@/lib/email';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate message length
    if (body.message.length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Send notification email to admin
    const adminEmailData: EmailData = {
      to: "hi@touchgrassdc.com", // Admin email
      subject: `Contact Form: ${body.subject}`,
      body: `New contact form submission from ${body.name} (${body.email}):\n\n${body.message}`,
      from: "hi@touchgrassdc.com",
      replyTo: body.email,
    };
    await sendContactFormEmail(adminEmailData);
    
    // Send confirmation email to user
    const userEmailData: EmailData = {
      to: body.email,
      subject: "Thank you for your message - TouchGrass DC",
      body: `Hi ${body.name},\n\nThank you for reaching out to TouchGrass DC. We've received your message about "${body.subject}" and will get back to you as soon as possible.\n\nBest regards,\nThe TouchGrass DC Team`,
      from: "hi@touchgrassdc.com",
    };
    await sendConfirmationEmail(userEmailData);

    // Return success response
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
        error: 'Internal server error. Please try again later.',
        success: false 
      },
      { status: 500 }
    );
  }
} 