import { Suspense } from 'react';
import { VerifyClient } from './VerifyClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Signing you in · Casper AI',
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="text-white/60 text-sm">Loading…</div>
        }
      >
        <VerifyClient />
      </Suspense>
    </main>
  );
}
