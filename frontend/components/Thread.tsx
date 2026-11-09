import { createContext, useContext, useEffect, useRef } from 'react';
import { formatShortDate, todayAt } from '../domain/dates';
import type { ChatMessage, Chip } from '../memory/schema';
import { ChatCardView } from './Cards';

/** True in the public demo, which must not include the mascot. */
export const PublicBuildContext = createContext(false);

export function Avatar({ size = 32 }: { size?: number }) {
  const isPublicBuild = useContext(PublicBuildContext);
  if (isPublicBuild) {
    return (
      <div aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-full bg-moisha-navy font-bold text-white" style={{ width: size, height: size }}>
        M
      </div>
    );
  }
  return <img src="./icon-192.png" alt="" width={size} height={size} className="shrink-0 rounded-full border border-moisha-border bg-white" style={{ width: size, height: size }} />;
}

function Message({ message, showAvatar }: { message: ChatMessage; showAvatar: boolean }) {
  if (message.author === 'host') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-moisha-navy px-3.5 py-2 text-[15px] leading-6 text-white">{message.text}</p>
      </div>
    );
  }
  const savedOn = todayAt(new Date(message.createdAt));
  return (
    <div className="flex items-start gap-2">
      <div className="w-8 shrink-0">{showAvatar && <Avatar />}</div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="w-fit max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border border-moisha-border bg-white px-3.5 py-2 text-[15px] leading-6">{message.text}</p>
        {message.card && savedOn !== todayAt(new Date()) && (
          <p className="hint">As of {formatShortDate(savedOn)}. Saved from that day, so it may have changed.</p>
        )}
        {message.card && <ChatCardView card={message.card} />}
      </div>
    </div>
  );
}

export function Thread({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  return (
    <div role="log" aria-live="polite" aria-label="Conversation with Moisha" className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
      {messages.map((message, index) => (
        <Message key={message.id} message={message} showAvatar={messages[index - 1]?.author !== 'moisha'} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

export function Chips({ chips, onPick }: { chips: Chip[]; onPick: (chip: Chip) => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onPick(chip)}
          className="min-h-11 rounded-full border border-moisha-royal bg-white px-3.5 text-sm font-medium text-moisha-royal"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
