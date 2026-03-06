import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | TouchGrass DC",
  description: "Terms of service for TouchGrass DC.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Last updated: March 2026
      </p>

      <div className="prose dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Overview</h2>
          <p>
            TouchGrass DC is a free event aggregation service for Washington,
            DC. By using this website, you agree to the following terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Event Information</h2>
          <p>
            Event details (dates, times, locations, costs) are sourced from
            public listings and may change without notice. We make reasonable
            efforts to keep information accurate but cannot guarantee it. Always
            verify details with the event organizer before attending.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">User-Submitted Content</h2>
          <p>
            If you submit events or contact us through the site, you agree not
            to submit false, misleading, or harmful content. We reserve the
            right to remove any user-submitted content at our discretion.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Limitation of Liability</h2>
          <p>
            TouchGrass DC is provided "as is" without warranties of any kind.
            We are not responsible for the accuracy of event listings, actions
            taken based on information on the site, or any damages arising from
            use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Contact</h2>
          <p>
            Questions about these terms? Reach out at{" "}
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
