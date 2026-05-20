export const metadata = {
  title: 'Welcome to Casper Pro 👻',
  robots: { index: false, follow: false },
};

export default function ReturnSuccessPage() {
  return (
    <main className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/5 backdrop-blur p-8 border border-white/10 text-center">
        <div className="text-5xl mb-4" aria-hidden>
          🎉
        </div>
        <h1 className="text-xl font-semibold mb-2">You're Pro!</h1>
        <p className="text-sm text-white/60">
          AI comments and both platforms are unlocked. You can close this tab and return to the
          Casper extension — it updates automatically.
        </p>
        <p className="text-[10px] text-white/40 mt-6">
          Need a receipt or want to change your subscription? Open the extension → Settings → Plan → Manage.
        </p>
      </div>
    </main>
  );
}
