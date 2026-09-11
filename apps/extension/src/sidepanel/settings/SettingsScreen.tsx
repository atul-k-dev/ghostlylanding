import type { User } from '@casper/shared';
import { COMMENT_LENGTH_LABELS } from '../pages/_shared.js';
import { FREE_TIER, isPro, monthlyActionsUsed } from '@casper/shared';
import {
  Activity01Icon,
  AiMagicIcon,
  Alert02Icon,
  AtIcon,
  Bug01Icon,
  CheckmarkBadge01Icon,
  CleanIcon,
  Clock01Icon,
  Crown02Icon,
  DashboardSpeed01Icon,
  File01Icon,
  Flag01Icon,
  GaugeIcon,
  HashtagIcon,
  Logout01Icon,
  MessageMultiple01Icon,
  Mic01Icon,
  News01Icon,
  PaintBoardIcon,
  Shield01Icon,
  ShieldKeyIcon,
  SmileIcon,
  StarIcon,
  Target02Icon,
  TextAlignLeftIcon,
  UserAdd01Icon,
  UserBlock01Icon,
  UserIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { sendToBackground } from '../../lib/messages.js';
import { SAFETY_PRESETS } from '../../lib/presets.js';
import { isTrusted } from '../../lib/trust.js';
import { DETAIL_TITLES, Detail, type DetailKey } from './details';
import { Group, ProBadge, Row, Screen, UpgradeCard } from './kit';
import { useSettingsStore } from './useSettingsStore';
import { useOnboarding } from '../onboarding/useOnboarding';
import { SetupCard } from '../onboarding/SetupCard';
import { label as nameOf, useAppearance } from '../appearance';

export type SettingsRoute = 'list' | DetailKey;

const SITE = 'https://ai-casper.vercel.app';
const open = (path: string) => void chrome.tabs.create({ url: `${SITE}${path}` });
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const onOff = (v: boolean) => (v ? 'On' : 'Off');

/**
 * Settings, two levels deep: the grouped list, and one detail page per row
 * that needs more than a switch. Reached by tapping the avatar.
 */
export const SettingsScreen = ({
  user,
  route,
  onRoute,
  onClose,
  onSignedOut,
  onOpenSetup,
}: {
  user: User;
  route: SettingsRoute;
  onRoute: (r: SettingsRoute) => void;
  onClose: () => void;
  onSignedOut: () => void;
  onOpenSetup: () => void;
}) => {
  const { settings, update, reload } = useSettingsStore();
  const onboarding = useOnboarding();
  const [appearance] = useAppearance();

  if (!settings) {
    return (
      <div className="grid h-full place-items-center bg-canvas text-xs text-muted-foreground">Catching up…</div>
    );
  }

  if (route !== 'list') {
    return (
      <Screen title={DETAIL_TITLES[route]} backLabel="Settings" onBack={() => onRoute('list')}>
        <Detail id={route} settings={settings} update={update} reload={reload} user={user} go={onRoute} />
      </Screen>
    );
  }

  const pro = isPro(user.subscriptionStatus ?? 'free');
  const go = (r: DetailKey) => () => onRoute(r);
  const toggle = (checked: boolean, set: (v: boolean) => void) => ({ checked, onChange: set });
  const s = settings;

  const signOut = async () => {
    await sendToBackground({ type: 'LOGOUT', payload: {} });
    onSignedOut();
  };

  return (
    <Screen title="Settings" backLabel="Home" onBack={onClose}>
      {!s.setupCompletedAt && <SetupCard fraction={onboarding.fraction} onOpen={onOpenSetup} />}

      <Group label="Info">
        <Row icon={UserIcon} label="Name" value={user.name || '—'} />
        <Row icon={AtIcon} label="Email" value={user.email} />
      </Group>

      {pro ? (
        <Group>
          <Row icon={Crown02Icon} label="Plan" value={<ProBadge />} onClick={go('plan')} />
        </Group>
      ) : (
        <UpgradeCard onUpgrade={go('plan')} />
      )}

      <Group label="App">
        <Row
          icon={GaugeIcon}
          label="Limits"
          value={pro ? 'Unlimited' : `${monthlyActionsUsed(user)} / ${FREE_TIER.monthlyActions} this month`}
          onClick={go('limits')}
        />
        <Row icon={Flag01Icon} label="Setup guide" value={s.setupCompletedAt ? 'Done' : 'Not finished'} onClick={onOpenSetup} />
        <Row
          icon={PaintBoardIcon}
          label="Appearance"
          value={`${nameOf(appearance.mode)} · ${nameOf(appearance.accent === 'base' ? appearance.base : appearance.accent)}`}
          onClick={go('appearance')}
        />
      </Group>

      <Group label="Autopilot">
        <Row
          icon={AiMagicIcon}
          label="Autopilot"
          toggle={toggle(!s.isPaused, (v) => update({ ...s, isPaused: !v }))}
        />
        <Row
          icon={DashboardSpeed01Icon}
          label="Work pace"
          value={SAFETY_PRESETS[s.safetyPreset]?.label ?? 'Custom'}
          onClick={go('intensity')}
        />
        <Row
          icon={Clock01Icon}
          label="Active hours"
          value={`${hh(s.activeHours.startHour)} – ${hh(s.activeHours.endHour)}`}
          onClick={go('hours')}
        />
        <Row
          icon={ViewIcon}
          label="Spotlight"
          hint="Outline what I'm working on, on x.com"
          toggle={toggle(s.spotlight, (v) => update({ ...s, spotlight: v }))}
        />
        {isTrusted(s.trust) && (
          <Row icon={ShieldKeyIcon} label="Posting on my own" value="On" onClick={go('trust')} />
        )}
      </Group>

      <Group label="Engagement">
        <Row icon={News01Icon} label="Home feed" value={onOff(s.homeFeed.enabled)} onClick={go('homeFeed')} />
        <Row icon={HashtagIcon} label="Topic feeds" value={s.searchQueries.length} onClick={go('topics')} />
        <Row icon={Target02Icon} label="Target creators" value={s.targetCreators.length} onClick={go('targets')} />
        <Row icon={UserBlock01Icon} label="Whitelist" value={s.whitelist.length} onClick={go('whitelist')} />
        <Row icon={UserAdd01Icon} label="Auto follow-back" value={onOff(s.followBack)} onClick={go('followBack')} />
        <Row
          icon={CleanIcon}
          label="Weekly clean-up"
          hint="Drop target creators quiet for 3+ weeks"
          toggle={toggle(s.autoTune.enabled, (v) => update({ ...s, autoTune: { ...s.autoTune, enabled: v } }))}
        />
      </Group>

      <Group label="Replies">
        <Row
          icon={Mic01Icon}
          label="Your voice"
          value={user.voiceProfile ? 'Learned' : 'Not set'}
          onClick={go('voice')}
        />
        <Row
          icon={SmileIcon}
          label="Reply tone"
          value={s.tone.charAt(0).toUpperCase() + s.tone.slice(1)}
          onClick={go('tone')}
        />
        <Row
          icon={TextAlignLeftIcon}
          label="Reply length"
          value={COMMENT_LENGTH_LABELS[s.commentLength].split(' · ')[0]}
          onClick={go('length')}
        />
        <Row
          icon={CheckmarkBadge01Icon}
          label="Auto-approve replies"
          hint="Post replies without asking me first"
          toggle={toggle(s.replyApproval === false, (v) => update({ ...s, replyApproval: !v }))}
        />
        <Row
          icon={MessageMultiple01Icon}
          label="Mentions"
          hint="Read mentions and draft replies"
          toggle={toggle(s.mentions.enabled, (v) => update({ ...s, mentions: { ...s.mentions, enabled: v } }))}
        />
      </Group>

      <Group label="Notifications" footer="Capped at a couple a day, whatever's switched on.">
        <Row
          icon={Alert02Icon}
          label="Something's broken"
          toggle={toggle(s.notifications.problems, (v) =>
            update({ ...s, notifications: { ...s.notifications, problems: v } }),
          )}
        />
        <Row
          icon={StarIcon}
          label="A big account replied"
          toggle={toggle(s.notifications.bigReplies, (v) =>
            update({ ...s, notifications: { ...s.notifications, bigReplies: v } }),
          )}
        />
      </Group>

      <Group label="About">
        <Row icon={Bug01Icon} label="Report a Problem" onClick={() => open('/support')} />
        <Row icon={Activity01Icon} label="Diagnostics" onClick={go('diagnostics')} />
        <Row icon={File01Icon} label="Terms of Use" onClick={() => open('/terms')} />
        <Row icon={Shield01Icon} label="Privacy Policy" onClick={() => open('/privacy')} />
      </Group>

      <Group footer={`Ghostly247 v${chrome.runtime.getManifest().version}`}>
        <Row icon={Logout01Icon} label="Sign out" danger onClick={() => void signOut()} />
      </Group>
    </Screen>
  );
};
