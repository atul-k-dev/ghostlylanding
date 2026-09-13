/**
 * The six engagement actions, drawn to match X's own affordances so the grid
 * reads instantly. 24x24, stroke-based, inherit currentColor.
 */

type P = { className?: string };

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const LikeIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 0 1 19.8 13Z" />
  </svg>
);

export const ReplyIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M20 12.5a7.5 7.5 0 0 1-7.5 7.5H4l2.1-2.6A7.5 7.5 0 1 1 20 12.5Z" />
  </svg>
);

export const FollowIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="10" cy="8.5" r="3.5" />
    <path d="M3.5 19.5a6.5 6.5 0 0 1 13 0M18.5 7.5v5M21 10h-5" />
  </svg>
);

export const BookmarkIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2L5.5 20.5v-16a1 1 0 0 1 1-1Z" />
  </svg>
);

export const RepostIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 9.5A3.5 3.5 0 0 1 7.5 6H18M18 6l-2.8-2.8M18 6l-2.8 2.8" />
    <path d="M20 14.5a3.5 3.5 0 0 1-3.5 3.5H6M6 18l2.8 2.8M6 18l2.8-2.8" />
  </svg>
);

export const QuoteIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9.5 6.5C7 7.6 5.5 9.8 5.5 12.4v5.1h5.2v-5.1H8.1c0-1.9.9-3.2 2.6-4ZM18.3 6.5c-2.5 1.1-4 3.3-4 5.9v5.1h5.2v-5.1h-2.6c0-1.9.9-3.2 2.6-4Z" />
  </svg>
);

export const AutoPostIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20l1-4.2L15.6 5.2a2.1 2.1 0 0 1 3 3L8 18.8Z" />
    <path d="M18.5 14.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7Z" />
  </svg>
);

export const SearchIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5 5" />
  </svg>
);

export const MentionIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.4 6.8" />
  </svg>
);

export const ScheduleIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4M12 13.5v2.5l1.8 1.2" />
  </svg>
);

export const FollowBackIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M2.5 19.5a6.5 6.5 0 0 1 11.5-4.2M16 16.5l2 2 3.5-4" />
  </svg>
);

export const EarlyReplyIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12Z" />
  </svg>
);

export const ACTION_ICONS = {
  like: LikeIcon,
  reply: ReplyIcon,
  follow: FollowIcon,
  bookmark: BookmarkIcon,
  repost: RepostIcon,
  quote: QuoteIcon,
  autopost: AutoPostIcon,
  search: SearchIcon,
  mentions: MentionIcon,
  schedule: ScheduleIcon,
  followback: FollowBackIcon,
  early: EarlyReplyIcon,
} as const;
