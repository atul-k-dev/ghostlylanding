import { EmptyState } from '../../ui/index.js';

/** Placeholder until 1.6 ports `ScheduleTab` (`Dashboard.tsx:1494-2011`) as a week strip. */
export const Posts = () => (
  <EmptyState
    icon="🗓"
    title="Your week of posts lands here"
    body="Drafts in their slots, and empty slots you can hand to me. Still yours to publish until Phase 3."
  />
);
