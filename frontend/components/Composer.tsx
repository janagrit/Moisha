import { Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export interface ComposerProps {
  input: 'text' | 'number' | 'date';
  placeholder: string;
  onSend: (text: string) => void;
}

export function Composer({ input, placeholder, onSend }: ComposerProps) {
  const [value, setValue] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue('');
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-moisha-border bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <input
        name="message"
        className="field min-w-0 flex-1"
        type={input === 'date' ? 'date' : 'text'}
        inputMode={input === 'number' ? 'decimal' : undefined}
        enterKeyHint="send"
        autoComplete="off"
        aria-label="Message Moisha"
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-moisha-navy text-white">
        <Send size={18} aria-hidden="true" />
      </button>
    </form>
  );
}
