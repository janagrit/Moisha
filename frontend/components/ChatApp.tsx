import { ChevronDown, Lock } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  afterBackup,
  afterImport,
  afterUndoImport,
  handleChip,
  handleText,
  importPreview,
  importRejected,
  openConversation,
  type Effect,
} from '../conversation/engine';
import { currentStep } from '../conversation/flows';
import { selectedProperty, type Ctx } from '../conversation/helpers';
import { buildSampleMemory } from '../conversation/sampleData';
import { decryptBackup, encryptBackup, isCryptoAvailable, isEncryptedBackup } from '../memory/backupCrypto';
import { exportFileName, exportMemory, parseImport, type ImportSummary } from '../memory/exportImport';
import type { Chip, Memory } from '../memory/schema';
import type { VaultSession } from '../memory/vault';
import { canReachSite } from '../services/connectivity';
import { shareOrDownload } from '../services/shareFile';
import { BackupReadyDialog, CreatePassphraseDialog, EnterPassphraseDialog } from './BackupDialogs';
import { Composer } from './Composer';
import { SampleContext } from './FigureView';
import { Avatar, Chips, Thread } from './Thread';

const CONNECTIVITY_RECHECK_MS = 60_000;
export const AUTO_LOCK_MS = 5 * 60_000;
const AUTO_LOCK_CHECK_MS = 5_000;

type BackupDialog =
  | { kind: 'create' }
  | { kind: 'ready'; fileName: string; contents: string }
  | { kind: 'enter'; fileText: string }
  | null;

export interface ChatAppProps {
  session: VaultSession;
  initialMemory: Memory;
  updateReady: boolean;
  onApplyUpdate: () => void;
  onLock: () => void;
  onErase: () => void;
}

/** The unlocked app. Unmounting it on lock is what removes the decrypted data from the screen and memory. */
export function ChatApp({ session, initialMemory, updateReady, onApplyUpdate, onLock, onErase }: ChatAppProps) {
  const [memory, setMemory] = useState(initialMemory);
  const [isSample, setIsSample] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [dialog, setDialog] = useState<BackupDialog>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  const realMemory = useRef<Memory | null>(null);
  const pendingImport = useRef<{ memory: Memory; summary: ImportSummary } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const askedPersistence = useRef(false);
  const lastActivity = useRef(Date.now());

  const ctx = (): Ctx => ({ now: new Date(), isSample, storagePersisted });

  // Everything saved goes through the vault. Sample data is never saved.
  useEffect(() => {
    if (isSample) return;
    session.save(memory).then((result) => {
      if (result.ok) setSaveWarning(null);
      else if (result.error === 'quota') setSaveWarning("This phone's storage is full, so I can't save anything new. Back up now.");
      else if (result.error === 'unavailable') setSaveWarning("I couldn't save that to this device.");
    });
  }, [memory, isSample, session]);

  // Timers stop while a phone sleeps, so this compares clock times and rechecks on return.
  useEffect(() => {
    const noteActivity = () => {
      lastActivity.current = Date.now();
    };
    const lockIfIdle = () => {
      if (Date.now() - lastActivity.current >= AUTO_LOCK_MS) onLock();
    };
    const activity = ['pointerdown', 'keydown', 'touchstart', 'input'] as const;
    activity.forEach((name) => window.addEventListener(name, noteActivity, { passive: true }));
    const timer = window.setInterval(lockIfIdle, AUTO_LOCK_CHECK_MS);
    document.addEventListener('visibilitychange', lockIfIdle);
    window.addEventListener('focus', lockIfIdle);
    window.addEventListener('pageshow', lockIfIdle);
    return () => {
      activity.forEach((name) => window.removeEventListener(name, noteActivity));
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', lockIfIdle);
      window.removeEventListener('focus', lockIfIdle);
      window.removeEventListener('pageshow', lockIfIdle);
    };
  }, [onLock]);

  useEffect(() => {
    const updateOnline = () => {
      canReachSite().then(setOnline);
    };
    updateOnline();
    const recheck = window.setInterval(updateOnline, CONNECTIVITY_RECHECK_MS);
    const checkOnReturn = () => {
      if (!document.hidden) updateOnline();
    };
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    document.addEventListener('visibilitychange', checkOnReturn);
    navigator.storage?.persisted?.().then(setStoragePersisted).catch(() => undefined);
    return () => {
      window.clearInterval(recheck);
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      document.removeEventListener('visibilitychange', checkOnReturn);
    };
  }, []);

  /** Browsers are more willing to grant this after the person has used the app. */
  const askForPersistence = () => {
    if (askedPersistence.current) return;
    askedPersistence.current = true;
    navigator.storage?.persist?.().then(setStoragePersisted).catch(() => undefined);
  };

  const closeDialog = () => {
    setDialog(null);
    setDialogBusy(false);
    setDialogError(null);
  };

  const leaveSample = () => {
    if (realMemory.current) setMemory(realMemory.current);
    realMemory.current = null;
    setIsSample(false);
  };

  const confirmImport = async (before: Memory, after: Memory) => {
    const pending = pendingImport.current;
    if (!pending) return;
    pendingImport.current = null;
    // The existing data is copied first, encrypted. If that fails, nothing is replaced.
    const kept = await session.saveBeforeImport(before);
    if (!kept.ok) {
      setMemory(importRejected(after, ctx(), "I couldn't keep a safety copy of what's here, so I changed nothing."));
      return;
    }
    setMemory(afterImport(pending.memory, ctx(), pending.summary));
  };

  const undoImport = async (after: Memory) => {
    const previous = await session.loadBeforeImport();
    if (!previous) {
      setMemory(importRejected(after, ctx(), "I don't have a copy to go back to."));
      return;
    }
    session.clearBeforeImport();
    setMemory(afterUndoImport(previous, ctx()));
  };

  const runEffect = (effect: Effect, before: Memory, after: Memory) => {
    switch (effect) {
      case 'backup':
        setDialogError(isCryptoAvailable() ? null : 'Encryption needs a secure (HTTPS) connection, so I did not create a backup.');
        setDialog({ kind: 'create' });
        break;
      case 'pick-file':
        fileInput.current?.click();
        break;
      case 'import-confirm':
        void confirmImport(before, after);
        break;
      case 'import-cancel':
        pendingImport.current = null;
        break;
      case 'undo-import':
        void undoImport(after);
        break;
      case 'start-sample': {
        const now = new Date();
        realMemory.current = before;
        setIsSample(true);
        setMemory(openConversation(buildSampleMemory(now), { now, isSample: true }));
        break;
      }
      case 'exit-sample':
        leaveSample();
        break;
      case 'reset':
        onErase();
        break;
    }
  };

  const onChip = (chip: Chip) => {
    askForPersistence();
    const result = handleChip(memory, chip, ctx());
    setMemory(result.memory);
    if (result.effect) runEffect(result.effect, memory, result.memory);
  };

  const showImportPreview = (plaintext: string) => {
    const result = parseImport(plaintext);
    if (result.ok) {
      pendingImport.current = { memory: result.memory, summary: result.summary };
      setMemory((current) => importPreview(current, ctx(), result.summary));
    } else {
      pendingImport.current = null;
      setMemory((current) => importRejected(current, ctx(), result.error));
    }
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    if (isEncryptedBackup(text)) {
      setDialogError(isCryptoAvailable() ? null : 'Decryption needs a secure (HTTPS) connection.');
      setDialog({ kind: 'enter', fileText: text });
    } else {
      showImportPreview(text);
    }
  };

  const createEncryptedBackup = async (passphrase: string) => {
    if (!isCryptoAvailable()) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      const now = new Date();
      const contents = await encryptBackup(exportMemory(memory, now), passphrase);
      setDialogBusy(false);
      setDialog({ kind: 'ready', fileName: exportFileName(now), contents });
    } catch {
      setDialogBusy(false);
      setDialogError("Encryption failed, so I didn't create a backup.");
    }
  };

  const saveEncryptedBackup = (fileName: string, contents: string) => {
    shareOrDownload(fileName, contents).then((outcome) => {
      closeDialog();
      setMemory((current) => afterBackup(current, ctx(), outcome));
    });
  };

  const cancelBackup = () => {
    closeDialog();
    setMemory((current) => afterBackup(current, ctx(), 'cancelled'));
  };

  const openEncryptedBackup = async (fileText: string, passphrase: string) => {
    if (!isCryptoAvailable()) return;
    setDialogBusy(true);
    setDialogError(null);
    const result = await decryptBackup(fileText, passphrase);
    setDialogBusy(false);
    if (result.ok) {
      closeDialog();
      showImportPreview(result.plaintext);
    } else {
      setDialogError(
        result.error === 'wrong-passphrase'
          ? "That passphrase didn't open this backup, or the file is damaged. Nothing changed."
          : "This backup file isn't readable. Nothing changed.",
      );
    }
  };

  const cancelRestore = () => {
    closeDialog();
    setMemory((current) => importRejected(current, ctx(), 'Left everything as it was.'));
  };

  const property = selectedProperty(memory);
  const step = currentStep(memory);
  const lastMessage = memory.messages[memory.messages.length - 1];
  const chips = lastMessage?.author === 'moisha' ? (lastMessage.chips ?? []) : [];
  const switchProperty: Chip = { label: 'Switch property', action: { type: 'show', view: 'properties' } };

  return (
    <SampleContext.Provider value={isSample}>
      <div className="mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-moisha-sand sm:border-x sm:border-moisha-border">
        {isSample && (
          <div role="status" className="flex items-center justify-between gap-2 bg-moisha-butter px-3 py-2 text-xs font-semibold text-moisha-amber">
            <span>SAMPLE DATA. These are not real listings.</span>
            <button type="button" className="shrink-0 underline" onClick={leaveSample}>
              Leave
            </button>
          </div>
        )}

        {updateReady && (
          <div className="flex items-center justify-between gap-2 bg-moisha-sky px-3 py-2 text-xs font-semibold">
            <span>A new version of Moisha is ready. You'll need your passcode after refreshing.</span>
            <button type="button" className="min-h-11 shrink-0 px-2 text-moisha-royal underline" onClick={onApplyUpdate}>
              Refresh
            </button>
          </div>
        )}

        <header className="flex items-center gap-3 border-b border-moisha-border bg-white px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Avatar size={44} />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-5">Moisha</h1>
            <p className="truncate text-xs text-moisha-muted">{online ? 'Only checks when this app is open' : 'Offline. Using saved data'}</p>
          </div>
          {property &&
            (memory.properties.length > 1 ? (
              <button type="button" onClick={() => onChip(switchProperty)} className="flex min-h-11 max-w-[35%] items-center gap-1 text-sm font-medium">
                <span className="truncate">{property.nickname}</span>
                <ChevronDown size={16} aria-hidden="true" className="shrink-0" />
              </button>
            ) : (
              <span className="max-w-[35%] truncate text-sm font-medium">{property.nickname}</span>
            ))}
          <button type="button" aria-label="Lock Moisha" onClick={onLock} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-moisha-navy">
            <Lock size={18} aria-hidden="true" />
          </button>
        </header>

        {saveWarning && (
          <div role="alert" className="bg-moisha-blush px-3 py-2 text-xs font-medium text-moisha-red">
            {saveWarning}
          </div>
        )}

        <main className="flex min-h-0 flex-1 flex-col">
          <Thread messages={memory.messages} />
        </main>
        <Chips chips={chips} onPick={onChip} />
        <Composer
          key={`${memory.activeFlow?.id ?? 'chat'}-${memory.activeFlow?.step ?? 0}`}
          input={step?.input ?? 'text'}
          placeholder={step?.placeholder ?? 'Message Moisha'}
          onSend={(text) => {
            askForPersistence();
            setMemory(handleText(memory, text, ctx()));
          }}
        />

        <input ref={fileInput} name="restore" type="file" accept="application/json,.json" className="hidden" onChange={onFile} data-testid="restore-file" />

        {dialog?.kind === 'create' && <CreatePassphraseDialog busy={dialogBusy} error={dialogError} onSubmit={createEncryptedBackup} onCancel={cancelBackup} />}
        {dialog?.kind === 'ready' && <BackupReadyDialog onSave={() => saveEncryptedBackup(dialog.fileName, dialog.contents)} onCancel={cancelBackup} />}
        {dialog?.kind === 'enter' && (
          <EnterPassphraseDialog busy={dialogBusy} error={dialogError} onSubmit={(passphrase) => openEncryptedBackup(dialog.fileText, passphrase)} onCancel={cancelRestore} />
        )}
      </div>
    </SampleContext.Provider>
  );
}
