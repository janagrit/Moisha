import { createContext, useContext } from 'react';
import { formatFigure, isKnown, provenanceLabel } from '../domain/provenance';
import type { Figure } from '../domain/types';

/** True while the sample conversation is showing. Every figure is then labelled as sample data. */
export const SampleContext = createContext(false);

const CHIP_STYLES: Record<Figure['provenance'], string> = {
  'verified-public': 'border-moisha-royal text-moisha-royal',
  'user-entered': 'border-moisha-border text-moisha-muted',
  estimate: 'border-amber-300 bg-moisha-butter text-moisha-amber',
  unavailable: 'border-transparent text-moisha-muted',
};

export function ProvenanceChip({ figure }: { figure: Figure }) {
  const isSample = useContext(SampleContext);
  const label = isSample && isKnown(figure) ? 'Sample data' : provenanceLabel(figure);
  const stale = isKnown(figure) && figure.stale ? ' · old' : '';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] leading-4 ${CHIP_STYLES[figure.provenance]}`}>
      {label}
      {stale}
    </span>
  );
}

export function FigureValue({ figure, className = '' }: { figure: Figure; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{isKnown(figure) ? formatFigure(figure) : 'Not yet'}</span>;
}
