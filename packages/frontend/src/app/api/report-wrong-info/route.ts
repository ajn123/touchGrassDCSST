import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventTitle, eventId, currentUrl } = body;

    // Validate required fields
    if (!eventTitle || !eventId || !currentUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Send email directly to the Lambda function
    const emailData = {
      subject: `Event Information Correction: ${eventTitle}`,
      body: `🚨 EVENT INFORMATION CORRECTION REQUEST

📋 EVENT DETAILS
================
Event Title: ${eventTitle}
Event ID: ${eventId}
Current URL: ${currentUrl}

📝 REQUEST
==========
Hi,

I found some incorrect information on this event. Please review and update the information.

Thanks!

---
This correction request was submitted through the TouchGrass DC website.`,
      to: "hi@touchgrassdc.com",
      from: "hi@touchgrassdc.com",
    };

    // Send email using the same route as other email functions
    const response = await fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lambda function error:", errorText);
      throw new Error(
        `Lambda function returned ${response.status}: ${errorText}`
      );
    }

    return NextResponse.json(
      { success: true, message: "Correction request sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing correction request:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send correction request. Please try again later.",
        success: false,
      },
      { status: 500 }
    );
  }
}
