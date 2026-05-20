export const metadata = {
  title: 'Checkout canceled · Casper AI',
  robots: { index: false, follow: false },
};

export default function BillingCancelPage() {
  return (
    <main className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/5 backdrop-blur p-8 border border-white/10 text-center">
        <div className="text-5xl mb-4" aria-hidden>
          👋
        </div>
        <h1 className="text-xl font-semibold mb-2">No worries, take your time.</h1>
        <p className="text-sm text-white/60">
          Your free plan stays active. Whenever you're ready, open the extension and pick Upgrade
          again.
        </p>
      </div>
    </main>
  );
}
