import { useState, type FormEvent, type ReactNode } from 'react';
import { MIN_PASSCODE_LENGTH, passcodeProblem } from '../memory/vault';
import { eraseSucceeded, type EraseReport } from '../services/deviceErase';
import { Avatar } from './Thread';

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-4 overflow-y-auto bg-moisha-sand p-4">
      <div className="flex items-center gap-3">
        <Avatar size={56} />
        <h1 className="text-lg font-bold leading-6">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function ErrorText({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="text-sm font-medium text-moisha-red">
      {text}
    </p>
  ) : null;
}

function UpdateBanner({ onApply }: { onApply: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-moisha-sky px-3 py-2 text-xs font-semibold">
      <span>A new version of Moisha is ready.</span>
      <button type="button" className="min-h-11 shrink-0 px-2 text-moisha-royal underline" onClick={onApply}>
        Refresh
      </button>
    </div>
  );
}

function EraseConfirm({ busy, onErase }: { busy: boolean; onErase: () => void }) {
  const [typed, setTyped] = useState('');
  return (
    <div className="space-y-2">
      <label className="label" htmlFor="erase-confirm">
        Type ERASE to confirm
      </label>
      <input id="erase-confirm" name="erase-confirm" className="field" autoComplete="off" autoCapitalize="characters" value={typed} onChange={(e) => setTyped(e.target.value)} />
      <button type="button" className="btn w-full bg-moisha-red text-white disabled:opacity-50" disabled={typed !== 'ERASE' || busy} onClick={onErase}>
        {busy ? 'Erasing...' : 'Erase this device'}
      </button>
    </div>
  );
}

interface CommonProps {
  busy: boolean;
  error: string | null;
  updateReady: boolean;
  onApplyUpdate: () => void;
}

export function CreatePasscodeScreen({ busy, error, updateReady, onApplyUpdate, hasExistingData, onCreate }: CommonProps & { hasExistingData: boolean; onCreate: (passcode: string) => void }) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const issue = passcodeProblem(first) ?? (first === second ? null : "Those two don't match.");
    setProblem(issue);
    if (issue) return;
    const passcode = first;
    setFirst('');
    setSecond('');
    onCreate(passcode);
  };

  return (
    <Shell title={hasExistingData ? 'Protect what I already know' : "Shalom! First, let's lock the door."}>
      {updateReady && <UpdateBanner onApply={onApplyUpdate} />}
      <form onSubmit={submit} className="card space-y-3">
        <p className="text-sm leading-6">
          {hasExistingData ? 'Your information on this device will be encrypted with this passcode.' : 'Everything you tell me is encrypted on this device with this passcode.'}
        </p>
        <div>
          <label className="label" htmlFor="new-passcode">
            New passcode
          </label>
          <input id="new-passcode" name="new-passcode" className="field" type="password" autoComplete="new-password" value={first} onChange={(e) => setFirst(e.target.value)} />
          <p className="hint mt-1">At least {MIN_PASSCODE_LENGTH} characters, including letters.</p>
        </div>
        <div>
          <label className="label" htmlFor="repeat-passcode">
            Repeat passcode
          </label>
          <input id="repeat-passcode" name="repeat-passcode" className="field" type="password" autoComplete="new-password" value={second} onChange={(e) => setSecond(e.target.value)} />
        </div>
        <p className="hint">
          <strong>Nobody can reset this passcode, and that includes me.</strong> If you forget it, the only way forward is to erase this device and restore from an encrypted backup.
        </p>
        <ErrorText text={problem ?? error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Encrypting...' : 'Create passcode'}
        </button>
      </form>
    </Shell>
  );
}

export function UnlockScreen({ busy, error, updateReady, onApplyUpdate, onUnlock, onErase }: CommonProps & { onUnlock: (passcode: string) => void; onErase: () => void }) {
  const [value, setValue] = useState('');
  const [forgot, setForgot] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!value) return;
    const passcode = value;
    setValue('');
    onUnlock(passcode);
  };

  return (
    <Shell title="Moisha is locked">
      {updateReady && <UpdateBanner onApply={onApplyUpdate} />}
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label" htmlFor="unlock-passcode">
            Passcode
          </label>
          <input id="unlock-passcode" name="passcode" className="field" type="password" autoComplete="current-password" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <ErrorText text={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Unlocking...' : 'Unlock'}
        </button>
      </form>
      {forgot ? (
        <div className="card space-y-3">
          <p className="text-sm leading-6">Nobody can recover this passcode. Your information here is encrypted with it and can't be opened without it.</p>
          <p className="hint">Erasing removes everything Moisha has stored in this browser. If you have an encrypted backup and its passphrase, you can restore it afterwards. Without a backup, the information is gone.</p>
          <EraseConfirm busy={busy} onErase={onErase} />
        </div>
      ) : (
        <button type="button" className="min-h-11 text-sm font-medium text-moisha-royal underline" onClick={() => setForgot(true)}>
          Forgot your passcode?
        </button>
      )}
    </Shell>
  );
}

export function CorruptVaultScreen({ busy, onErase }: { busy: boolean; onErase: () => void }) {
  return (
    <Shell title="I can't read this device's data">
      <div className="card space-y-3">
        <p role="alert" className="text-sm leading-6">
          The saved information here is damaged, or it came from a newer version of Moisha. I haven't changed it.
        </p>
        <p className="hint">If you have an encrypted backup, you can erase this device and restore it.</p>
        <EraseConfirm busy={busy} onErase={onErase} />
      </div>
    </Shell>
  );
}

export function UnsupportedScreen({ reason }: { reason: 'storage' | 'crypto' }) {
  return (
    <Shell title="Moisha can't protect your data here">
      <div className="card">
        <p role="alert" className="text-sm leading-6">
          {reason === 'storage'
            ? 'This browser is blocking storage, so nothing could be saved. Check its privacy settings, or use a different browser.'
            : "Encryption needs a secure (HTTPS) connection. I won't store your information without it."}
        </p>
      </div>
    </Shell>
  );
}

export function ErasedScreen({ report, onContinue }: { report: EraseReport; onContinue: () => void }) {
  const complete = eraseSucceeded(report);
  const failed = [
    report.storage ? null : 'saved data',
    report.caches ? null : 'cached app files',
    report.serviceWorkers ? null : 'the offline worker',
    report.databases ? null : 'browser databases',
  ].filter(Boolean);

  return (
    <Shell title={complete ? 'This device has been erased' : 'The erase did not fully finish'}>
      <div className="card space-y-3">
        {complete ? (
          <p className="text-sm leading-6">Moisha's saved data, cached app files, browser databases and offline worker are gone from this browser.</p>
        ) : (
          <p role="alert" className="text-sm leading-6">
            I couldn't confirm the removal of: {failed.join(', ')}. Clear this site's data in your browser settings to finish.
          </p>
        )}
        <p className="hint">Not affected: backup files saved or sent elsewhere, the app's icon on your home screen, and your login with the website. Opening Moisha again now needs an internet connection.</p>
        <button type="button" className="btn-primary w-full" onClick={onContinue}>
          Set up again
        </button>
      </div>
    </Shell>
  );
}
