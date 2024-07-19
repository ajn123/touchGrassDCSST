
// Create a custom email function that uses existing SES identity
const email = $app.stage === "production"
      ? sst.aws.Email.get("Email", "hello@touchgrassdc.com")
      : new sst.aws.Email("Email", {
          sender: "hello@touchgrassdc.com",
        });



const sendEmail = new sst.aws.Function("SendEmail", {
  handler: "packages/functions/src/email/api.handler",
  link: [email],
  url: true,
  environment: {
    SES_SENDER: "hello@touchgrassdc.com",
    SES_SANDBOX_MODE: "false", // Set to true for development
    SES_VERIFIED_EMAIL: "hello@touchgrassdc.com", // Replace with your verified email
  },
});

export { sendEmail as email };