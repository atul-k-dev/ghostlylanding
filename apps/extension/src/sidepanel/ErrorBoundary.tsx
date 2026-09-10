import React from 'react';

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors in the popup so a crashed component doesn't
 * leave the user staring at a blank popup. Renders a recovery card and
 * logs the error to the extension's diagnostics (best-effort).
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[casper] side panel render crash', error, info);
    try {
      // Dynamic import — keeps the boundary independent of any storage shape change.
      void import('../lib/storage.js').then(({ appendDiagnostic }) =>
        appendDiagnostic({
          // Was 'auth_failure', which is not what a render crash is — it made
          // every popup bug look like a sign-in problem on the health view.
          kind: 'crash',
          context: 'popup:render',
          detail: `${error.message}\n${(info.componentStack ?? '').slice(0, 300)}`.slice(0, 480),
        }),
      );
    } catch {
      /* best-effort */
    }
  }

  private reset = (): void => this.setState({ error: null });

  private reload = (): void => {
    try {
      chrome.runtime.reload();
    } catch {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className="casper-app w-[480px] min-h-[300px] p-6 text-casper-ink">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white text-xl">
            👻
          </div>
          <div>
            <h1 className="text-lg font-semibold">Ghostly247 hit a snag</h1>
            <p className="text-xs text-casper-ink/60">
              The popup crashed. Your data is safe.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-casper-border bg-casper-surface p-4">
          <p className="mb-3 text-xs text-casper-ink/70">
            We logged the error in Diagnostics. Try resetting the view; if that doesn't help,
            reload the extension.
          </p>
          <p className="mb-3 break-all rounded-lg bg-casper-cloud p-2 text-[10px] text-casper-ink/50">
            {this.state.error.message}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="flex-1 rounded-xl bg-casper-violet px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.reload}
              className="rounded-xl border border-casper-ink/10 px-3 py-2 text-xs text-casper-ink/70 transition hover:bg-white/5"
            >
              Reload extension
            </button>
          </div>
        </div>
      </main>
    );
  }
}
