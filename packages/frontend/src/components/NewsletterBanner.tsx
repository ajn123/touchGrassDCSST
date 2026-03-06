'use client';

import { useState, useEffect } from 'react';

export default function NewsletterBanner() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('newsletter_subscribed') === 'true') return;
    setHidden(false);
  }, []);

  if (hidden || status === 'success') {
    if (status === 'success') {
      return (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div
            className="rounded-2xl p-6 text-center"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
          >
            <p className="text-lg font-semibold" style={{ color: '#10b981' }}>
              You&apos;re subscribed! Check your inbox every Thursday.
            </p>
          </div>
        </section>
      );
    }
    return null;
  }

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

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
        }}
      >
        <div className="px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 text-center sm:text-left">
            <h3
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Get the best DC events in your inbox
            </h3>
            <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              A curated weekly digest every Thursday — no spam, unsubscribe anytime.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={status === 'loading'}
              className="rounded-lg px-4 py-3 text-sm outline-none w-full sm:w-64"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: '#10b981' }}
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe Free'}
            </button>
          </form>
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-500 px-6 sm:px-10 pb-4">{errorMsg}</p>
        )}
      </div>
    </section>
  );
}
