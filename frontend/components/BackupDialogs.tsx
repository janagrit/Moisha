import { useState, type FormEvent, type ReactNode } from 'react';
import { MIN_PASSPHRASE_LENGTH } from '../memory/backupCrypto';

function Dialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-moisha-navy/40 p-3 sm:items-center">
      <div role="dialog" aria-modal="true" aria-label={title} className="card w-full max-w-md">
        <h2 className="text-base font-bold">{title}</h2>
        {children}
      </div>
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

interface PassphraseProps {
  busy: boolean;
  error: string | null;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
}

export function CreatePassphraseDialog({ busy, error, onSubmit, onCancel }: PassphraseProps) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (first.length < MIN_PASSPHRASE_LENGTH) {
      setProblem(`Use at least ${MIN_PASSPHRASE_LENGTH} characters. A short sentence works well.`);
    } else if (first !== second) {
      setProblem("Those two don't match.");
    } else {
      setProblem(null);
      onSubmit(first);
    }
  };

  return (
    <Dialog title="Encrypt your backup">
      <form onSubmit={submit} className="mt-2 space-y-3">
        <p className="hint">Nobody can open this backup without the passphrase, and that includes me. If you lose it, the backup is gone. Share it with your manager separately from the file.</p>
        <div>
          <label className="label" htmlFor="backup-passphrase">
            Passphrase
          </label>
          <input id="backup-passphrase" name="new-passphrase" className="field" type="password" autoComplete="new-password" value={first} onChange={(e) => setFirst(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="backup-passphrase-repeat">
            Repeat passphrase
          </label>
          <input id="backup-passphrase-repeat" name="repeat-passphrase" className="field" type="password" autoComplete="new-password" value={second} onChange={(e) => setSecond(e.target.value)} />
        </div>
        <ErrorText text={problem ?? error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-quiet" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Encrypting...' : 'Encrypt backup'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function EnterPassphraseDialog({ busy, error, onSubmit, onCancel }: PassphraseProps) {
  const [value, setValue] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value) onSubmit(value);
  };

  return (
    <Dialog title="Open encrypted backup">
      <form onSubmit={submit} className="mt-2 space-y-3">
        <p className="hint">Nothing on this device changes yet. I'll show you what's inside first.</p>
        <div>
          <label className="label" htmlFor="restore-passphrase">
            Passphrase
          </label>
          <input id="restore-passphrase" name="passphrase" className="field" type="password" autoComplete="current-password" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <ErrorText text={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-quiet" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Opening...' : 'Open backup'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** A separate tap, because phones only open the share sheet straight after a tap. */
export function BackupReadyDialog({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <Dialog title="Your encrypted backup is ready">
      <p className="hint mt-2">Save it somewhere safe, or send it to your manager.</p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={onSave}>
          Save or share
        </button>
      </div>
    </Dialog>
  );
}
