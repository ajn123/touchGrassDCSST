'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function UnsubscribedContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    missing_token: 'The unsubscribe link is missing a token.',
    invalid_token: 'This unsubscribe link is invalid or has already been used.',
    server_error: 'Something went wrong. Please try again later.',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {error ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Oops
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {errorMessages[error] || 'An unexpected error occurred.'}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4" style={{ backgroundColor: '#10b981' }}>
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              You&apos;ve been unsubscribed
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              You won&apos;t receive any more newsletters from TouchGrass DC.
            </p>
            <p className="mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Changed your mind? Visit our site and subscribe again anytime.
            </p>
          </>
        )}

        <a
          href="/"
          className="inline-block mt-6 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#10b981' }}
        >
          Back to TouchGrass DC
        </a>
      </div>
    </div>
  );
}

export default function UnsubscribedPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      }
    >
      <UnsubscribedContent />
    </Suspense>
  );
}
