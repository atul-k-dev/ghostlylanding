/**
 * The shared component library for BOTH modes — the side panel (Phase 1) and
 * the floating panel injected into x.com (Phase 2). Anything that renders in
 * both belongs here; anything that knows about a specific tab does not.
 */
export { Panel } from './Panel.js';
export { TopBar } from './TopBar.js';
export type { TopBarAction } from './TopBar.js';
export { TabBar } from './TabBar.js';
export type { TabSpec } from './TabBar.js';
export { StatusBar } from './StatusBar.js';
export type { EngineState } from './StatusBar.js';
export { Card } from './Card.js';
export { Button } from './Button.js';
export type { ButtonVariant } from './Button.js';
export { Stat } from './Stat.js';
export { PaceBar } from './PaceBar.js';
export { FeedLine } from './FeedLine.js';
export { EmptyState } from './EmptyState.js';
