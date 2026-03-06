import { sendEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventTitle, eventId, currentUrl } = body;

    if (!eventTitle || !eventId || !currentUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await sendEmail({
      to: "hi@touchgrassdc.com",
      subject: `Event Information Correction: ${eventTitle}`,
      body: `Event: ${eventTitle}\nEvent ID: ${eventId}\nURL: ${currentUrl}\n\nPlease review and update the information.`,
      from: "hi@touchgrassdc.com",
    });

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
            : "Failed to send correction request.",
        success: false,
      },
      { status: 500 }
    );
  }
}
