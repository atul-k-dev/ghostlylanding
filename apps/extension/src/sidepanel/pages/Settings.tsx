import { EmptyState } from '../../ui/index.js';

/**
 * The gear's three pages — Who I watch · Voice · Settings — are ported in 1.6.
 * Until then this says so rather than showing controls that write nowhere.
 */
export const Settings = () => (
  <EmptyState
    icon="⚙"
    title="Who I watch, your voice, and the rest"
    body="Targets, topics, tone and the account controls move in here next."
  />
);
