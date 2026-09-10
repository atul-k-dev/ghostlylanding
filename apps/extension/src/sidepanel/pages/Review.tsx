import { EmptyState } from '../../ui/index.js';

/**
 * Placeholder until 1.6 ports the queue from `Dashboard.tsx:995-1112` and adds
 * `Edit & post`, `Never like this` and `Post all`. Deliberately not a fake list.
 */
export const Review = () => (
  <EmptyState
    icon="✍️"
    title="Replies waiting on you land here"
    body="Each one shows the post it answers, so you can approve it without leaving the panel."
  />
);
