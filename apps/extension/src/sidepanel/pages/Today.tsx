import { Card, PaceBar, Stat, EmptyState } from '../../ui/index.js';
import type { EngineStatus } from '../useEngineStatus.js';

/**
 * Today, as of 1.2: the parts that are real (what the engine is doing right
 * now, and how much of the day's safe allowance is spent) and nothing else.
 *
 * 1.6 fills in the three outcome numbers with yesterday beneath and the live
 * feed from the action log; 1.7 replaces the bare reason line below with the
 * condition table's card-and-one-button. Neither is stubbed with fake numbers
 * here — an invented "+6 followers" is worse than an empty panel.
 */
export const Today = ({ status }: { status: EngineStatus }) => (
  <div className="flex flex-col gap-3 p-3">
    <Card
      tone={status.state === 'attention' ? 'attention' : 'default'}
      title={status.label}
    >
      {status.blockReason?.detail && (
        <p className="text-xs leading-relaxed text-casper-muted">{status.blockReason.detail}</p>
      )}
      {!status.blockReason && !status.settings?.isPaused && (
        <p className="text-xs leading-relaxed text-casper-muted">
          Nothing needs doing. I&rsquo;ll keep going.
        </p>
      )}
    </Card>

    <Card title="Today&rsquo;s pace">
      <div className="mb-3 flex items-end justify-between gap-4">
        <Stat
          value={status.spent}
          label="actions today"
          sub={status.allowance > 0 ? `${status.allowance} is today’s safe limit` : undefined}
          tone={status.spent > 0 ? 'working' : 'default'}
        />
      </div>
      <PaceBar fraction={status.pace ?? 0} />
    </Card>

    <EmptyState
      icon="📋"
      title="The live feed lands here"
      body="Every like, reply and follow, as it happens, with the post it happened on."
    />
  </div>
);
