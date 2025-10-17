import { ContactForm } from "@/components/ContactForm";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Contact Section */}
      <div className=" rounded-lg shadow-lg p-8 mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg rounded-lg p-6">
            Have questions about our events or need assistance? We'd love to
            hear from you!
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <ContactForm />
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6">About Touchgrassdc.com</h2>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-700 leading-relaxed mb-6">
            Touchgrassdc.com is about showcasing events in the DC area and
            giving you something to get out of the house every night.
          </p>

          <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-8">
            <h2 className="text-2xl font-semibold text-green-800 mb-4">
              Why "Touch Grass"?
            </h2>
            <p className="text-green-700">
              In today's digital world, it's easy to get stuck inside scrolling
              through screens. We believe in the power of real experiences,
              human connections, and getting out into the world. That's why
              we're here to help you discover amazing events happening right
              here in Washington, DC.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-blue-800 mb-3">
                Discover Local Events
              </h3>
              <p className="text-blue-700">
                From live music and art exhibitions to food festivals and
                outdoor adventures, we curate the best events happening in and
                around DC.
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              Ready to Get Out There?
            </h3>
            <p className="text-gray-700 mb-4">
              Browse our events, find something that interests you, and make
              plans to touch some grass today!
            </p>
            <a
              href="/"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Explore Events
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
