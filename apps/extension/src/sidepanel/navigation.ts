/**
 * Where a card's one button can send you.
 *
 * Kept as its own module so a page can offer a button that navigates without
 * importing the whole App (and creating a cycle). Deliberately a closed union:
 * a button that goes "somewhere" is how a condition card ends up leading
 * nowhere useful.
 */
export type PanelTarget = 'today' | 'review' | 'posts' | 'growth' | 'ask' | 'account' | 'settings' | 'who' | 'voice' | 'setup';
