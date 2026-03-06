import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | TouchGrass DC",
  description: "Privacy policy for TouchGrass DC.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Last updated: March 2026
      </p>

      <div className="prose dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Information We Collect</h2>
          <p>
            TouchGrass DC collects minimal information to provide our event
            aggregation service. This includes anonymous visit data (pages
            viewed, timestamps) to improve the site experience. We do not
            require account creation to browse events.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">How We Use Your Information</h2>
          <p>
            Any information collected is used solely to operate and improve
            TouchGrass DC. We use anonymous analytics to understand which
            features are most useful and to identify technical issues.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Cookies</h2>
          <p>
            We use a single anonymous visitor cookie (<code>tg_vid</code>) to
            track page visits for analytics purposes. This cookie does not
            contain personal information and is not shared with third parties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Third-Party Services</h2>
          <p>
            Event data displayed on TouchGrass DC is aggregated from public
            sources. We link to external event pages and group websites, which
            have their own privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Contact</h2>
          <p>
            If you have questions about this privacy policy, please contact us
            at{" "}
            <a
              href="mailto:hi@touchgrassdc.com"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              hi@touchgrassdc.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
