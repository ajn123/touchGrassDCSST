import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

const PRIMARY_EMAIL = "hi@touchgrassdc.com";

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

async function sendEmail(emailData: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}) {
  try {
    // Use the SST Resource for the Lambda function URL
    const response = await fetch(Resource.SendEmail.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`Email service returned ${response.status}`);
    }

    console.log("Email sent successfully to:", emailData.to);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

async function handleDirectEmail(data: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}) {
  try {
    // Validate required fields
    if (!data.to || !data.subject || !data.body) {
      return NextResponse.json(
        { error: "to, subject, and body are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.to)) {
      return NextResponse.json(
        { error: "Invalid recipient email format" },
        { status: 400 }
      );
    }

    // Send the email
    await sendEmail({
      to: data.to,
      subject: data.subject,
      body: data.body,
      from: data.from || PRIMARY_EMAIL,
      replyTo: data.replyTo,
    });

    return NextResponse.json(
      {
        message: "Email sent successfully",
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending direct email:", error);

    return NextResponse.json(
      {
        error: "Failed to send email. Please try again later.",
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle direct email requests
    return await handleDirectEmail(body as EmailRequest);
  } catch (error) {
    console.error("Error in sendEmail API:", error);

    return NextResponse.json(
      {
        error: "Invalid request format",
        success: false,
      },
      { status: 400 }
    );
  }
}
