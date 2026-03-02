'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    document.body.style.overflow = 'unset';
    if (status !== 'success') {
      localStorage.setItem('newsletter_dismissed', Date.now().toString());
    }
  }, [status]);

  // Show popup after 30 seconds if not already subscribed/dismissed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (localStorage.getItem('newsletter_subscribed') === 'true') return;

    const dismissed = localStorage.getItem('newsletter_dismissed');
    if (dismissed) {
      // Don't show again for 7 days after dismissal
      const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };

    if (visible) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visible, dismiss]);

  // Auto-close after success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        setVisible(false);
        document.body.style.overflow = 'unset';
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Something went wrong');
        return;
      }

      setStatus('success');
      localStorage.setItem('newsletter_subscribed', 'true');
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 transition-opacity"
          onClick={dismiss}
        />

        {/* Modal */}
        <div
          ref={modalRef}
          className="relative transform overflow-hidden rounded-2xl shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1 rounded-full transition-colors hover:opacity-80"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="px-6 pt-8 pb-6">
            {status === 'success' ? (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4" style={{ backgroundColor: '#10b981' }}>
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  You&apos;re in!
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Check your inbox for the next weekly roundup of DC events.
                </p>
              </div>
            ) : (
              <>
                <h3
                  className="text-xl font-bold mb-2 text-center"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Never miss what&apos;s happening in DC
                </h3>
                <p
                  className="text-sm mb-6 text-center"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Get a curated weekly digest of the best events, delivered every Thursday.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-primary)',
                    }}
                    disabled={status === 'loading'}
                  />

                  {status === 'error' && (
                    <p className="text-sm text-red-500">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </form>

                <p
                  className="text-xs mt-4 text-center"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  No spam. Unsubscribe anytime.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
