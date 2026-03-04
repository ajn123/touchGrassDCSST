import { EmailSignupForm } from "@/components/EmailSignupForm";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import type { Metadata } from "next";
import { Resource } from "sst";

export const metadata: Metadata = {
  title: "Sign Up for Event Updates",
  description:
    "Get notified about new events in your favorite categories. Weekly email updates about DC events, groups, and activities.",
  openGraph: {
    title: "Sign Up for Event Updates | TouchGrass DC",
    description:
      "Get weekly email updates about events in Washington DC.",
    url: "https://touchgrassdc.com/signup-emails",
  },
};

export default async function EmailSignupPage() {
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const categories = await db.getCategories();

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sign Up For Event Updates</h1>
          <p className=" mt-2">
            Get notified about new events in your favorite categories
          </p>
        </div>

        <EmailSignupForm
          categories={categories as Array<{ category: string }>}
        />
      </div>
    </div>
  );
}
