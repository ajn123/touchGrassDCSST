'use client';

import { useState } from 'react';
import { sendEmail, sendWelcomeEmail, sendEventReminder, ApiResponse } from '@/lib/api';

export default function TestEmailPage() {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDirectEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await sendEmail(emailData);
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWelcomeEmail = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await sendWelcomeEmail(emailData.to, 'Test User');
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventReminder = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await sendEventReminder(
        emailData.to,
        'Test User',
        'Hiking Trip',
        'Tomorrow at 9 AM',
        'Rock Creek Park'
      );
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Email API Test</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Send Direct Email</h2>
          
          <form onSubmit={handleDirectEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Email *
              </label>
              <input
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email subject"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                value={emailData.body}
                onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email message"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 text-white font-medium rounded-md ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Sending...' : 'Send Email'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Email Templates</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email
              </label>
              <input
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleWelcomeEmail}
                disabled={isLoading || !emailData.to}
                className={`px-4 py-2 text-white font-medium rounded-md ${
                  isLoading || !emailData.to ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Send Welcome Email
              </button>

              <button
                onClick={handleEventReminder}
                disabled={isLoading || !emailData.to}
                className={`px-4 py-2 text-white font-medium rounded-md ${
                  isLoading || !emailData.to ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                Send Event Reminder
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className={`p-4 rounded-md ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              <div className={`w-5 h-5 mr-3 ${
                result.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.success ? '✓' : '✗'}
              </div>
              <div>
                <p className={`font-medium ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.success ? 'Success!' : 'Error'}
                </p>
                <p className={`text-sm ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.message || result.error}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">API Usage Examples</h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium">Direct Email:</h4>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`await sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  body: 'This is a test email'
});`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium">Welcome Email:</h4>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`await sendWelcomeEmail('user@example.com', 'John Doe');`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium">Event Reminder:</h4>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`await sendEventReminder(
  'user@example.com',
  'John Doe',
  'Hiking Trip',
  'Tomorrow at 9 AM',
  'Rock Creek Park'
);`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 