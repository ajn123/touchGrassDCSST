import { handle } from "hono/aws-lambda";
import { issuer } from "@openauthjs/openauth";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { subjects } from "./subjects";
import { Resource } from "sst";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

async function getUser(email: string) {
  // List of allowed admin emails
  const allowedEmails = [
    'admin@example.com', // Replace with your actual admin email
    'hi@touchgrassdc.com',
    // Add more admin emails as needed
  ];
  
  if (!allowedEmails.includes(email.toLowerCase())) {
    throw new Error("Access denied. Admin only.");
  }

  // Return email as user ID for valid admin users
  return email;
}

const app = issuer({
  subjects,
  // Remove after setting custom domain
  allow: async () => true,
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (email, code) => {
          console.log(email, code);

          // Extract email string from the email object
          const emailString = typeof email === 'string' ? email : email.email || Object.values(email)[0];
          
          // Send email using SESv2
          const client = new SESv2Client();
          const command = new SendEmailCommand({
            FromEmailAddress: Resource.hi.sender,
            Destination: {
              ToAddresses: [emailString]
            },
            Content: {
              Simple: {
                Subject: { Data: "Your TouchGrassDC verification code" },
                Body: { Text: { Data: `Your TouchGrassDC verification code is: ${code}` } }
              }
            }
          });
          
          await client.send(command);
        },
      }),
    ),
  },
  // The `success` function is called when a user successfully authenticates with a provider.
  // It receives the context (`ctx`) and the authentication result (`value`).
  // If the provider used is "code", it retrieves the user ID using the email from the claims,
  // and returns a subject of type "user" with that ID.
  // If the provider is not "code", it throws an error.
  success: async (ctx, value) => {
    if (value.provider === "code") {
      try {
        const userId = await getUser(value.claims.email);
        return ctx.subject("user", {
          id: userId,
        });
      } catch (error) {
        console.error("User validation failed:", error);
        throw new Error("Access denied. Admin only.");
      }
    }
    throw new Error("Invalid provider");
  },
});

export const handler = handle(app as any);

// Export for SST
export { handler as default };
