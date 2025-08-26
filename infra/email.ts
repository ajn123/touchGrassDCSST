// Create a custom email function that uses existing SES identity

const email =
  $app.stage === "production"
    ? sst.aws.Email.get("hi", "hi@touchgrassdc.com")
    : new sst.aws.Email("hi", {
        sender: "hi@touchgrassdc.com",
      });

const sendEmail = new sst.aws.Function("SendEmail", {
  handler: "packages/functions/src/email/api.handler",
  timeout: "1 minute",
  link: [email],
  url: true,
  environment: {
    SES_SENDER: "hi@touchgrassdc.com",
    SES_SANDBOX_MODE: "false", // Set to true for development
    SES_VERIFIED_EMAIL: "hi@touchgrassdc.com", // Replace with your verified email
  },
});

export { sendEmail as email, email as EmailConfig };
