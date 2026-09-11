import type { PanelTarget } from '../navigation.js';
import type { EngineStatus } from '../useEngineStatus.js';
import { HeroCards } from '../home/HeroCards.js';
import { StatusCard } from '../home/StatusCard.js';
import { FollowersCard } from '../home/FollowersCard.js';
import { Attention, AutoTuneDrops, BestTime, TodayBudget, TopPosts, WhatsWorking } from '../home/Insights.js';
import { useGrowth } from '../home/useGrowth.js';
import { useTodayNumbers } from '../home/useTodayNumbers.js';
import { TrustOfferCard } from './AutoPosting.js';

/**
 * Home, top to bottom:
 *   hero cards      — today's wins, the autopilot switch, today's limit
 *   status card     — what Ghostly is doing; also alerts and replies to approve
 *   followers       — the number and the line
 *   today's activity, best time to post, what's working, where attention
 *   comes from, your best posts
 */
export const Home = ({
  status,
  onNavigate,
}: {
  status: EngineStatus;
  onNavigate: (target: PanelTarget) => void;
}) => {
  const growth = useGrowth();
  const today = useTodayNumbers(status, growth);

  return (
    <div className="flex flex-col gap-3 pt-1">
      <HeroCards status={status} today={today} />
      <div className="flex flex-col gap-3 px-4">
        <StatusCard status={status} onNavigate={onNavigate} />
        {/* The "post without asking?" offer appears after enough approvals. */}
        {status.settings && <TrustOfferCard settings={status.settings} onSettings={() => void status.refresh()} />}
        <AutoTuneDrops growth={growth} />
        <FollowersCard growth={growth} />
        <TodayBudget today={today} />
        <BestTime growth={growth} onNavigate={onNavigate} />
        <WhatsWorking growth={growth} />
        <Attention growth={growth} />
        <TopPosts growth={growth} onNavigate={onNavigate} />
      </div>
    </div>
  );
};
