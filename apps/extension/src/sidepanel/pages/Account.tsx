import type { PaidPlan, User } from '@casper/shared';
import { PAID_PLANS, PLAN_PRICING, isPro } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { Card, Button } from '../../ui/index.js';

/**
 * Who you are signed in as, what you are on, and the way out.
 *
 * 1.6 folds notifications, timezone and delete-account in beside these. The
 * plan buttons are the real checkout path (`START_CHECKOUT` needs a plan id, so
 * both are offered rather than one guessed default).
 */
export const Account = ({ user, onSignedOut }: { user: User; onSignedOut: () => void }) => {
  const pro = isPro(user.subscriptionStatus ?? 'free');

  const signOut = async () => {
    await sendToBackground({ type: 'LOGOUT', payload: {} });
    onSignedOut();
  };

  const checkout = (plan: PaidPlan) =>
    void sendToBackground({ type: 'START_CHECKOUT', payload: { plan } });

  return (
    <div className="flex flex-col gap-3 p-3">
      <Card title="Signed in">
        <p className="truncate text-xs text-casper-muted">{user.email}</p>
      </Card>

      {pro ? (
        <Card
          title="Ghostly247 Pro"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void sendToBackground({ type: 'OPEN_BILLING_PORTAL', payload: {} })}
            >
              Manage
            </Button>
          }
        >
          <p className="text-xs leading-relaxed text-casper-muted">
            Everything unlocked, with no monthly limit on what I do for you.
          </p>
        </Card>
      ) : (
        <Card title="You’re on Free">
          <p className="mb-3 text-xs leading-relaxed text-casper-muted">
            Every feature works on Free. The only limit is how many actions I can take each month.
          </p>
          <div className="flex flex-col gap-1.5">
            {PAID_PLANS.map((plan) => (
              <Button key={plan} variant="primary" full onClick={() => checkout(plan)}>
                {PLAN_PRICING[plan].amount} a {PLAN_PRICING[plan].per}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <Button variant="ghost" full onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
};
