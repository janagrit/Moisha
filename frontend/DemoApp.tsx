import { useState } from 'react';
import { Composer } from './components/Composer';
import { SampleContext } from './components/FigureView';
import { Avatar, Chips, PublicBuildContext, Thread } from './components/Thread';
import { handleChip, handleText, openConversation } from './conversation/engine';
import { currentStep } from './conversation/flows';
import type { Ctx } from './conversation/helpers';
import { buildSampleMemory } from './conversation/sampleData';
import type { Chip, Memory } from './memory/schema';

/**
 * Public portfolio demo. Fictional data held in this page's memory only.
 * This build never imports browser storage, backup, encryption or service-worker code.
 */

const demoCtx = (): Ctx => ({ now: new Date(), isSample: true, isDemo: true });
const freshDemo = (): Memory => openConversation(buildSampleMemory(new Date()), demoCtx());

export default function DemoApp() {
  const [memory, setMemory] = useState(freshDemo);

  const onChip = (chip: Chip) => {
    const result = handleChip(memory, chip, demoCtx());
    setMemory(result.effect === 'reset' ? freshDemo() : result.memory);
  };

  const step = currentStep(memory);
  const lastMessage = memory.messages[memory.messages.length - 1];
  const chips = lastMessage?.author === 'moisha' ? (lastMessage.chips ?? []) : [];

  return (
    <PublicBuildContext.Provider value={true}>
    <SampleContext.Provider value={true}>
      <div className="mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-moisha-sand sm:border-x sm:border-moisha-border">
        <div role="status" className="bg-moisha-butter px-3 py-2 text-xs font-semibold text-moisha-amber">
          PORTFOLIO DEMO. Fictional data. Nothing you type is saved or sent. Please don't enter real information.
        </div>

        <header className="flex items-center gap-3 border-b border-moisha-border bg-white px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Avatar size={44} />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-5">Moisha</h1>
            <p className="truncate text-xs text-moisha-muted">Demo with fictional data</p>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">
          <Thread messages={memory.messages} />
        </main>
        <Chips chips={chips} onPick={onChip} />
        <Composer
          key={`${memory.activeFlow?.id ?? 'chat'}-${memory.activeFlow?.step ?? 0}`}
          input={step?.input ?? 'text'}
          placeholder={step?.placeholder ?? 'Message Moisha'}
          onSend={(text) => setMemory(handleText(memory, text, demoCtx()))}
        />
      </div>
    </SampleContext.Provider>
    </PublicBuildContext.Provider>
  );
}
