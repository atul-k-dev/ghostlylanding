import { useEffect, useState } from 'react';
import type { DryRunCandidate } from '../../platforms/common/content-messages.js';
import { sendToBackground } from '../../lib/messages.js';
import { Button, Card, EmptyState } from '../../ui/index.js';

/**
 * Setup step 3 — what it would do, having done none of it.
 *
 * This is the screen that earns the right to run unattended. It is the real
 * feed loop with every action disabled, so the ten posts here are the ten posts
 * it would genuinely have engaged, and each reply is one the model really
 * wrote. Nothing on this screen has touched X.
 */
type Verdict = 'good' | 'rejected';

export const DryRun = ({ onReady }: { onReady: (anyGood: boolean) => void }) => {
  const [candidates, setCandidates] = useState<DryRunCandidate[] | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(0);

  const run = async () => {
    setRunning(true);
    setError(null);
    const resp = await sendToBackground<{
      ok: boolean;
      data?: { candidates: DryRunCandidate[]; scanned: number };
      error?: { message: string };
    }>({ type: 'DRY_RUN', payload: {} });
    setRunning(false);
    if (resp.ok && resp.data) {
      setCandidates(resp.data.candidates);
      setScanned(resp.data.scanned);
      onReady(resp.data.candidates.length > 0);
    } else {
      setError(resp.error?.message ?? 'I could not read your feed just now.');
    }
  };

  useEffect(() => {
    void run();
    // Once, on arrival — re-running is a button, not a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const judge = async (c: DryRunCandidate, verdict: Verdict) => {
    setVerdicts((v) => ({ ...v, [c.postId]: verdict }));
    if (verdict === 'rejected') {
      await sendToBackground({
        type: 'DRY_RUN_REJECT',
        payload: { text: c.text, draft: c.draft ?? null },
      });
    }
  };

  /** Scroll the X tab to this post. Phase 2.3 adds the coral outline on top. */
  const show = (c: DryRunCandidate) => {
    void chrome.tabs.create({ url: c.postUrl, active: true });
  };

  if (running) {
    return (
      <Card title="Reading your feed the way I would">
        <p className="text-xs leading-relaxed text-casper-muted">
          I&rsquo;m picking ten posts and writing a reply for each one, without posting anything.
          A tab will open while I do it. This takes a minute or two.
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card tone="attention" title="I couldn’t read your feed">
        <p className="mb-3 text-xs leading-relaxed text-casper-muted">{error}</p>
        <Button variant="primary" full onClick={() => void run()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (candidates && candidates.length === 0) {
    return (
      <EmptyState
        icon="🌱"
        title="Nothing in your feed matched just now"
        body={
          scanned > 0
            ? `I looked at ${scanned} posts and none of them were worth your time — which is a real answer, not a failure. You can start anyway and I'll keep watching.`
            : 'I could not see any posts. Open x.com in another tab, make sure you are signed in, and try again.'
        }
        action={
          <Button variant="secondary" onClick={() => void run()}>
            Look again
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs leading-relaxed text-casper-muted">
        These are the next {candidates?.length} posts I&rsquo;d go for. Nothing here has been
        liked, followed or replied to.
      </p>

      {candidates?.map((c) => {
        const verdict = verdicts[c.postId];
        return (
          <Card
            key={c.postId}
            tone={verdict === 'good' ? 'working' : 'default'}
            className={verdict === 'rejected' ? 'opacity-45' : ''}
            title={
              <button
                type="button"
                onClick={() => show(c)}
                className="cursor-pointer text-left text-[13px] font-medium text-casper-fg hover:text-casper-coral"
              >
                {c.authorHandle ? `@${c.authorHandle}` : 'A post in your feed'}
              </button>
            }
          >
            <p className="mb-2 line-clamp-3 text-xs leading-relaxed text-casper-muted">{c.text}</p>

            {c.draft && (
              <p className="mb-2 border-l-2 border-casper-coral/40 pl-2 text-xs leading-relaxed text-casper-fg/90">
                {c.draft}
              </p>
            )}
            {c.draftError && (
              <p className="mb-2 text-xs leading-relaxed text-casper-attention">
                I couldn&rsquo;t write a reply for this one: {c.draftError}
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-casper-muted">
                {c.wouldDo.length > 0 ? `Would ${c.wouldDo.join(', ')}` : 'Would read it'}
              </span>
              {verdict ? (
                <span
                  className={[
                    'shrink-0 text-xs',
                    verdict === 'good' ? 'text-casper-working' : 'text-casper-muted',
                  ].join(' ')}
                >
                  {verdict === 'good' ? 'Good' : 'Skipped'}
                </span>
              ) : (
                <span className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => void judge(c, 'rejected')}>
                    Not this one
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => void judge(c, 'good')}>
                    Good
                  </Button>
                </span>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
