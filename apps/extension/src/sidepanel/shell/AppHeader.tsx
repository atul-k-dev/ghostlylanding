import { isPro, type User } from '@casper/shared';
import { HugeiconsIcon } from '@hugeicons/react';
import { GiftIcon, Notification03Icon } from '@hugeicons/core-free-icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { firstName, greeting, initials } from './user';

/**
 * The panel's one header: who you are on the left (tap to open Settings), the
 * credit balance and the bell on the right. Pause and close deliberately live
 * elsewhere — the header stays clean.
 *
 * The credit badge is for Free only — on a paid plan there's no limit for
 * credits to lift. It reads the stored user, so it moves the moment an action
 * spends a credit (the background writes the new balance to storage).
 */
export const AppHeader = ({
  user,
  unread,
  onOpenProfile,
  onOpenNotifications,
  onOpenInvite,
}: {
  user: User;
  unread: number;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onOpenInvite: () => void;
}) => {
  const credits = user.bonusCredits ?? 0;
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label="Open settings"
        className="group flex min-w-0 items-center gap-3 rounded-full text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <Avatar className="size-12 ring-2 ring-border transition group-hover:ring-foreground/30">
          <AvatarFallback className="bg-secondary text-base font-semibold text-foreground">
            {initials(user.name, user.email)}
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col">
          <span className="text-xs text-muted-foreground">{greeting()} 👋</span>
          <span className="truncate font-heading text-xl leading-tight font-semibold tracking-tight">
            {firstName(user.name, user.email)}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        {!isPro(user.subscriptionStatus ?? 'free') && (
          <Button
            variant="outline"
            onClick={onOpenInvite}
            aria-label={`${credits} free credits — invite friends for more`}
            title="Free credits — invite friends for more"
            className="h-12 gap-1.5 rounded-full px-3.5 font-semibold tabular-nums"
          >
            <HugeiconsIcon icon={GiftIcon} strokeWidth={2} className="size-5 text-primary" />
            {credits}
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-lg"
          onClick={onOpenNotifications}
          aria-label={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'}
          className="relative size-12 shrink-0 rounded-full"
        >
          <HugeiconsIcon icon={Notification03Icon} strokeWidth={2} className="size-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums ring-2 ring-canvas">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
};
