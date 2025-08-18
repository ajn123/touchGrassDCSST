import { NextResponse } from "next/server";

export async function GET() {
  const startTime = Date.now();

  try {
    // Simple health check
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      ...healthData,
      responseTime: `${totalTime}ms`,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Health check failed after ${totalTime}ms:`, error);

    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Health check failed",
        responseTime: `${totalTime}ms`,
      },
      { status: 500 }
    );
  }
}
