import { EmailConfig } from "./email";

const auth = new sst.aws.Auth("Auth", {
    // From where sst.config.ts is located
    issuer:  {
        handler: "packages/auth/index.handler",
        link: [EmailConfig],
        permissions: [
            {
                actions: [
                    "ses:SendEmail",
                    "ses:SendRawEmail"
                ],
                resources: [
                    "arn:aws:ses:*:*:identity/hi@touchgrassdc.com"
                ]
            }
        ]
    }
    },
);

export { auth };