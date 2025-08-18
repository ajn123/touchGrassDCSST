import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
const PRIMARY_EMAIL = 'hi@touchgrassdc.com';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, categories } = body;

    // Validate required fields
    if (!name || !email || !categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const signupId = `EMAIL_SIGNUP#${timestamp}`;

    // Create the item for DynamoDB
    const item = {
      pk: { S: signupId },
      sk: { S: signupId },
      name: { S: name },
      email: { S: email },
      categories: { L: categories.map((cat: string) => ({ S: cat })) },
      createdAt: { N: timestamp.toString() },
      updatedAt: { N: timestamp.toString() }
    };

    const command = new PutItemCommand({
      TableName: Resource.Db.name,
      Item: item
    });

    await client.send(command);

    // Send email notification about the new signup
    try {
      const emailBody = `📧 NEW EMAIL SIGNUP ON TOUCHGRASS DC

📋 SIGNUP DETAILS
=================
Name: ${name}
Email: ${email}
Categories of Interest: ${categories.join(', ')}
Signup ID: ${signupId}
Signed up at: ${new Date().toLocaleString()}

🎯 WHAT THIS MEANS
==================
This person will now receive email updates about events in their selected categories.

---
This signup was submitted through the TouchGrass DC website.`.trim();

      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: PRIMARY_EMAIL,
          subject: `New Email Signup: ${name}`,
          body: emailBody,
          from: PRIMARY_EMAIL,
          replyTo: email
        }),
      });

      if (!response.ok) {
        console.error('Failed to send email notification:', response.status);
      } else {
        console.log('Email signup notification sent successfully');
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the signup if email notification fails
    }

    return NextResponse.json(
      { message: 'Email signup successful' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing email signup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 