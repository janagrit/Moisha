import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatApp } from './components/ChatApp';
import { CorruptVaultScreen, CreatePasscodeScreen, ErasedScreen, UnlockScreen, UnsupportedScreen } from './components/LockScreen';
import { openConversation } from './conversation/engine';
import { isCryptoAvailable } from './memory/backupCrypto';
import { createEmptyMemory, type Memory } from './memory/schema';
import { loadMemory, MEMORY_KEY, removeLegacyPlaintext } from './memory/storage';
import { createVault, inspectVault, unlockVault, VAULT_KEY, type VaultSession } from './memory/vault';
import { eraseThisDevice, type EraseReport } from './services/deviceErase';
import { registerPwa, type PwaHandle } from './services/pwa';

type Stage =
  | { kind: 'unsupported'; reason: 'storage' | 'crypto' }
  | { kind: 'create'; existing: Memory | null }
  | { kind: 'locked' }
  | { kind: 'corrupt' }
  | { kind: 'open'; session: VaultSession; memory: Memory }
  | { kind: 'erased'; report: EraseReport };

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function firstStage(): Stage {
  const storage = getStorage();
  if (!storage) return { kind: 'unsupported', reason: 'storage' };
  if (!isCryptoAvailable()) return { kind: 'unsupported', reason: 'crypto' };
  try {
    const status = inspectVault(storage);
    if (status === 'locked') return { kind: 'locked' };
    if (status === 'corrupt') return { kind: 'corrupt' };
    // Data saved before encryption is migrated when the host creates a passcode.
    const legacy = loadMemory(storage, MEMORY_KEY, new Date());
    return { kind: 'create', existing: legacy.status === 'ok' ? legacy.memory : null };
  } catch {
    return { kind: 'unsupported', reason: 'storage' };
  }
}

const CREATE_ERRORS = {
  quota: "This device is out of storage, so I couldn't encrypt anything. Nothing was changed.",
  unavailable: "I couldn't write to this device's storage. Nothing was changed.",
  'verify-failed': "Encryption couldn't be verified, so I changed nothing. Please try again.",
};

const UNLOCK_ERRORS = {
  'wrong-passcode': "That passcode didn't open it. Nothing was changed.",
  corrupt: "This device's saved information is damaged. Nothing was changed.",
  unreadable: 'The saved information came from a newer version of Moisha. Nothing was changed.',
};

export default function App() {
  const [stage, setStage] = useState<Stage>(firstStage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const pwa = useRef<PwaHandle | null>(null);
  const activeSession = useRef<VaultSession | null>(null);

  useEffect(() => {
    pwa.current = registerPwa(() => setUpdateReady(true));
    const checkOnReturn = () => {
      if (!document.hidden) pwa.current?.checkForUpdate();
    };
    document.addEventListener('visibilitychange', checkOnReturn);

    // If another tab erases the device, this one must stop at once or its next save would restore the data.
    const onStorageChange = (event: StorageEvent) => {
      const vaultRemoved = event.key === null || (event.key === VAULT_KEY && event.newValue === null);
      if (!vaultRemoved) return;
      activeSession.current?.lock();
      activeSession.current = null;
      setError(null);
      setStage(firstStage());
    };
    window.addEventListener('storage', onStorageChange);

    return () => {
      document.removeEventListener('visibilitychange', checkOnReturn);
      window.removeEventListener('storage', onStorageChange);
    };
  }, []);

  const openSession = (session: VaultSession, memory: Memory) => {
    activeSession.current = session;
    setError(null);
    setStage({ kind: 'open', session, memory: openConversation(memory, { now: new Date() }) });
  };

  const create = async (passcode: string, existing: Memory | null) => {
    const storage = getStorage();
    if (!storage) return;
    setBusy(true);
    setError(null);
    const memory = existing ?? createEmptyMemory(new Date());
    const result = await createVault(storage, passcode, memory);
    setBusy(false);
    if (!result.ok) {
      setError(CREATE_ERRORS[result.error]);
      return;
    }
    removeLegacyPlaintext(storage);
    openSession(result.session, memory);
  };

  const unlock = async (passcode: string) => {
    const storage = getStorage();
    if (!storage) return;
    setBusy(true);
    setError(null);
    const result = await unlockVault(storage, passcode);
    setBusy(false);
    if (!result.ok) {
      setError(UNLOCK_ERRORS[result.error]);
      return;
    }
    openSession(result.session, result.memory);
  };

  /** Saves finish first, then the key is dropped and the decrypted data leaves the screen. */
  const lock = useCallback(() => {
    const session = activeSession.current;
    if (!session) return;
    activeSession.current = null;
    void session.whenIdle().then(() => {
      session.lock();
      setError(null);
      setStage({ kind: 'locked' });
    });
  }, []);

  const erase = useCallback(async () => {
    const session = activeSession.current;
    activeSession.current = null;
    setBusy(true);
    // Any save still in progress must finish first, or it could write data back after the erase.
    await session?.whenIdle();
    session?.lock();
    const report = await eraseThisDevice();
    setBusy(false);
    setError(null);
    setStage({ kind: 'erased', report });
  }, []);

  const applyUpdate = () => pwa.current?.applyUpdate();
  const common = { busy, error, updateReady, onApplyUpdate: applyUpdate };

  switch (stage.kind) {
    case 'unsupported':
      return <UnsupportedScreen reason={stage.reason} />;
    case 'create':
      return <CreatePasscodeScreen {...common} hasExistingData={stage.existing !== null} onCreate={(passcode) => void create(passcode, stage.existing)} />;
    case 'locked':
      return <UnlockScreen {...common} onUnlock={(passcode) => void unlock(passcode)} onErase={() => void erase()} />;
    case 'corrupt':
      return <CorruptVaultScreen busy={busy} onErase={() => void erase()} />;
    case 'erased':
      return <ErasedScreen report={stage.report} onContinue={() => setStage({ kind: 'create', existing: null })} />;
    case 'open':
      return (
        <ChatApp
          session={stage.session}
          initialMemory={stage.memory}
          updateReady={updateReady}
          onApplyUpdate={applyUpdate}
          onLock={lock}
          onErase={() => void erase()}
        />
      );
  }
}
