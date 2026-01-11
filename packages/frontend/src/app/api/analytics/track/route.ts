import { sendToQueue } from "@/lib/queue";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get raw body text first for debugging
    let bodyText: string;
    try {
      bodyText = await request.text();
    } catch (readError) {
      console.error("Failed to read request body in analytics track:", {
        error: readError instanceof Error ? readError.message : String(readError),
        errorType: readError instanceof Error ? readError.constructor.name : typeof readError,
      });
      return NextResponse.json(
        { error: "Failed to read request body", message: readError instanceof Error ? readError.message : String(readError) },
        { status: 400 }
      );
    }

    // Validate body is not empty
    if (!bodyText || bodyText.trim().length === 0) {
      console.error("Empty request body in analytics track");
      return NextResponse.json(
        { error: "Request body is empty" },
        { status: 400 }
      );
    }

    // Log the received body for debugging (especially around position 222)
    console.log("Received analytics body:", {
      length: bodyText.length,
      preview: bodyText.substring(0, Math.min(500, bodyText.length)),
      charAt222: bodyText[222] || "N/A",
      contextAround222: bodyText.length > 222 
        ? bodyText.substring(Math.max(0, 222 - 50), Math.min(bodyText.length, 222 + 50))
        : "N/A (body too short)",
    });

    // Helper function to try to fix common JSON syntax errors
    function tryFixJSON(jsonString: string): string {
      // Remove trailing commas before } or ]
      let fixed = jsonString.replace(/,(\s*[}\]])/g, "$1");
      // Remove trailing commas in objects/arrays
      fixed = fixed.replace(/,(\s*})/g, "$1");
      fixed = fixed.replace(/,(\s*])/g, "$1");
      return fixed;
    }

    // Parse JSON with comprehensive error handling
    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      // Try to fix common JSON syntax errors before giving up
      try {
        const fixed = tryFixJSON(bodyText);
        body = JSON.parse(fixed);
        console.log("Successfully parsed JSON after fixing syntax errors");
      } catch (fixError) {
        // If fixing didn't work, log the original error
      // Extract position from error message if available
      const positionMatch = parseError instanceof SyntaxError && parseError.message.includes("position")
        ? parseError.message.match(/position (\d+)/)
        : null;
      const position = positionMatch ? parseInt(positionMatch[1]) : null;

      // Get context around the error position
      const getContextAroundPosition = (pos: number): string => {
        const start = Math.max(0, pos - 100);
        const end = Math.min(bodyText.length, pos + 100);
        const context = bodyText.substring(start, end);
        const relativePos = pos - start;
        return `${context.substring(0, relativePos)}<ERROR_HERE>${context.substring(relativePos)}`;
      };

      // Log detailed error information
      const errorDetails = {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        errorType: parseError instanceof Error ? parseError.constructor.name : typeof parseError,
        bodyLength: bodyText.length,
        bodyPreview: bodyText.substring(0, 500),
        bodySuffix: bodyText.length > 500 ? bodyText.substring(bodyText.length - 200) : undefined,
        ...(position !== null && {
          position,
          characterAtPosition: bodyText[position] || "N/A",
          contextAroundPosition: getContextAroundPosition(position),
        }),
        // Check for common JSON issues
        hasUnclosedString: (bodyText.match(/"/g) || []).length % 2 !== 0,
        hasUnclosedBrace: (bodyText.match(/{/g) || []).length !== (bodyText.match(/}/g) || []).length,
        hasUnclosedBracket: (bodyText.match(/\[/g) || []).length !== (bodyText.match(/\]/g) || []).length,
        hasControlCharacters: /[\x00-\x1F\x7F-\x9F]/.test(bodyText),
        encoding: request.headers.get("content-encoding") || "none",
        contentType: request.headers.get("content-type") || "none",
      };

        console.error("Failed to parse JSON body in analytics track (even after fixing):", errorDetails);
        
        return NextResponse.json(
          { 
            error: "Invalid JSON format", 
            message: parseError instanceof Error ? parseError.message : String(parseError),
            ...(position !== null && { position }),
          },
          { status: 400 }
        );
      }
    }

    // Validate parsed body structure
    if (!body || typeof body !== "object") {
      console.error("Parsed body is not an object:", { body, bodyType: typeof body });
      return NextResponse.json(
        { error: "Invalid body format: expected object" },
        { status: 400 }
      );
    }

    // Validate required fields if needed
    if (!body.pk && !body.action) {
      console.warn("Analytics body missing required fields:", { body });
      // Don't fail, just log a warning
    }

    // Add message to batch (non-blocking) with error handling
    try {
      await sendToQueue(body);
    } catch (queueError) {
      console.error("Failed to send analytics event to queue:", {
        error: queueError instanceof Error ? queueError.message : String(queueError),
        body: JSON.stringify(body).substring(0, 200),
      });
      // Don't fail the request if queue fails - analytics is non-critical
      // Return success but log the error
    }

    return NextResponse.json({ message: "Event tracked" });
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error("Unexpected error in analytics track endpoint:", {
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
