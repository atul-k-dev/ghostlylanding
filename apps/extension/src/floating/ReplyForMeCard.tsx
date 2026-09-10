import { useEffect, useState } from 'react';
import { Card, Button } from '../ui/index.js';
import {
  getReplyForMe,
  subscribeReplyForMe,
  postReplyForMe,
  dismissReplyForMe,
  type ReplyForMeState,
} from './reply-for-me.js';

/**
 * The panel half of "Reply for me" (updateplan 2.4).
 *
 * Three ways out and no fourth: **Post it** sends what is on screen, **Change
 * it** opens the same text for editing (and sending an edited version is what
 * teaches the voice), **Never mind** throws it away. Nothing here posts without
 * a press — the whole product rests on the user believing that.
 */

export const useReplyForMe = (): ReplyForMeState => {
  const [state, setState] = useState<ReplyForMeState>(getReplyForMe);
  useEffect(() => subscribeReplyForMe(setState), []);
  return state;
};

export const ReplyForMeCard = ({ state }: { state: ReplyForMeState }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  // A new draft replaces whatever was on screen, editor and all.
  useEffect(() => {
    if (state.status === 'ready') {
      setText(state.draft);
      setEditing(false);
    }
  }, [state.status, state.status === 'ready' ? state.draft : '']);

  if (state.status === 'idle') return null;

  const who =
    'post' in state && state.post.authorHandle
      ? `@${state.post.authorHandle.replace(/^@/, '')}`
      : 'this post';

  if (state.status === 'drafting') {
    return (
      <Card title={`Writing a reply to ${who}…`}>
        <p className="text-xs leading-relaxed text-casper-muted">
          It lands here the moment it&rsquo;s ready. Nothing goes out until you say so.
        </p>
      </Card>
    );
  }

  if (state.status === 'posted') {
    return (
      <Card
        tone="working"
        title="Sent"
        action={
          <Button size="sm" variant="ghost" onClick={dismissReplyForMe}>
            Close
          </Button>
        }
      >
        <p className="text-xs leading-relaxed text-casper-muted">
          Your reply to {who} is up, and it counts against today&rsquo;s pace like any other.
        </p>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <Card
        tone="attention"
        title="I didn’t send it"
        action={
          <Button size="sm" variant="ghost" onClick={dismissReplyForMe}>
            Close
          </Button>
        }
      >
        <p className="text-xs leading-relaxed text-casper-muted">{state.message}</p>
      </Card>
    );
  }

  const posting = state.status === 'posting';
  const generated = state.draft;

  return (
    <Card title={`Reply to ${who}`}>
      <p className="mb-2 line-clamp-3 rounded-xl bg-casper-surface-2 px-2.5 py-2 text-xs leading-snug text-casper-muted">
        {state.post.text}
      </p>

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
          className="w-full resize-none rounded-lg border border-casper-border bg-casper-bg px-2 py-1.5 text-xs leading-snug text-casper-fg focus:border-casper-coral focus:outline-none"
        />
      ) : (
        <p className="rounded-lg border border-casper-border bg-casper-bg px-2 py-1.5 text-xs leading-snug text-casper-fg">
          {text}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={posting || text.trim().length < 2}
          onClick={() =>
            void postReplyForMe(state.post, text, generated, 'draftId' in state ? state.draftId : undefined)
          }
        >
          {posting ? 'Posting…' : editing ? 'Post my version' : 'Post it'}
        </Button>
        {!editing && (
          <Button size="sm" variant="secondary" disabled={posting} onClick={() => setEditing(true)}>
            Change it
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={posting} onClick={dismissReplyForMe}>
          Never mind
        </Button>
      </div>
    </Card>
  );
};
