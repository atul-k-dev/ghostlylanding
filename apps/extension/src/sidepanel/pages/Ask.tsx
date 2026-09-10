import { EmptyState } from '../../ui/index.js';

/**
 * Ask is a Phase 5 feature and this says so plainly. The plan is explicit:
 * do not fake it. A text box that swallows questions and answers nothing would
 * cost more trust than an empty tab ever could.
 */
export const Ask = () => (
  <EmptyState
    icon="💬"
    title="Ask isn’t here yet"
    body="Telling me what you want in your own words — “post more”, “why did I lose followers?” — arrives once there’s enough of your own data for me to answer honestly rather than plausibly."
  />
);
