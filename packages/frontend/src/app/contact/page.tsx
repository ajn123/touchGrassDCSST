import { ContactForm } from '@/components/ContactForm';

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600 bg-green-50 rounded-lg p-6">
            Have questions about our events or need assistance? We'd love to hear from you!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <ContactForm />
        </div>
        

      </div>
    </div>
  );
} 