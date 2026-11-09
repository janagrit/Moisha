import { isKnown } from '../domain/provenance';
import type { Figure } from '../domain/types';
import type { CardRow, ChatCard } from '../memory/schema';
import { FigureValue, ProvenanceChip } from './FigureView';

function Row({ row, showChip }: { row: CardRow; showChip: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <div className="min-w-0 break-words text-sm text-moisha-navy">
        {row.label}
        {row.note && <span className="text-xs text-moisha-muted"> · {row.note}</span>}
      </div>
      <div className="shrink-0 text-right">
        {row.figure ? (
          <>
            <FigureValue figure={row.figure} className={`block text-sm font-semibold ${isKnown(row.figure) ? '' : 'text-moisha-muted'}`} />
            {showChip && <ProvenanceChip figure={row.figure} />}
          </>
        ) : (
          <span className="text-sm font-semibold">{row.text}</span>
        )}
      </div>
    </div>
  );
}

/** When every row has the same kind of source, one label covers them and each row stays one line. */
function sharedSource(rows: CardRow[]): Figure | null {
  const figures = rows.flatMap((r) => (r.figure ? [r.figure] : []));
  if (figures.length === 0 || figures.length !== rows.length) return null;
  const knownFigures = figures.filter(isKnown);
  if (knownFigures.length !== figures.length || knownFigures.some((f) => f.stale)) return null;
  if (knownFigures.some((f) => f.provenance !== knownFigures[0].provenance)) return null;
  return knownFigures.reduce((newest, f) => (f.asOf > newest.asOf ? f : newest));
}

function Rows({ rows }: { rows: CardRow[] }) {
  const shared = sharedSource(rows);
  return (
    <>
      {shared && (
        <div className="flex items-center justify-between gap-2 pt-2 text-xs text-moisha-muted">
          <span>These figures</span>
          <ProvenanceChip figure={shared} />
        </div>
      )}
      <div className="divide-y divide-moisha-border">
        {rows.map((row) => (
          <Row key={row.label + (row.note ?? '')} row={row} showChip={shared === null} />
        ))}
      </div>
    </>
  );
}

function Notes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1 border-t border-moisha-border pt-3">
      {notes.map((note) => (
        <li key={note} className="hint">
          {note}
        </li>
      ))}
    </ul>
  );
}

function isRaise(recommended: Figure, rows: CardRow[]): boolean {
  const current = rows.find((r) => r.label === 'Your price')?.figure;
  return !!current && isKnown(current) && isKnown(recommended) && recommended.value > current.value;
}

export function ChatCardView({ card }: { card: ChatCard }) {
  switch (card.type) {
    case 'price':
      return (
        <section className="card" aria-label={`Price for ${card.propertyName}`}>
          <div className="text-xs font-medium text-moisha-muted">
            {card.propertyName} · {card.nightLabel}
          </div>
          <div className="mt-2 text-xs font-medium text-moisha-muted">Moisha's price</div>
          <div className="flex flex-wrap items-center gap-2">
            <FigureValue
              figure={card.recommended}
              className={`text-3xl font-bold ${isRaise(card.recommended, card.rows) ? 'text-moisha-green' : ''}`}
            />
            <ProvenanceChip figure={card.recommended} />
          </div>
          {card.recommendedNote && <p className="mt-1 text-xs leading-5 text-moisha-muted">{card.recommendedNote}</p>}
          <div className="mt-2 border-t border-moisha-border">
            <Rows rows={card.rows} />
          </div>
          {card.matchCheapest && (
            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-moisha-sky px-3 py-2">
              <span className="text-sm">Or match the cheapest open neighbor</span>
              <FigureValue figure={card.matchCheapest} className="shrink-0 text-sm font-semibold" />
            </div>
          )}
          <Notes notes={card.notes} />
        </section>
      );
    case 'comps':
      return (
        <section className="card" aria-label={`Neighbors of ${card.propertyName}`}>
          <div className="text-xs font-medium text-moisha-muted">{card.propertyName} · neighbors</div>
          <Rows rows={card.rows} />
          <Notes notes={card.notes} />
        </section>
      );
    case 'gaps':
      return (
        <section className="card" aria-label={`Empty nights at ${card.propertyName}`}>
          <div className="text-xs font-medium text-moisha-muted">{card.propertyName} · empty nights</div>
          <Rows rows={card.rows} />
          {card.atMost && (
            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-moisha-butter px-3 py-2">
              <span className="text-sm">The most these could earn</span>
              <FigureValue figure={card.atMost} className="shrink-0 text-sm font-semibold" />
            </div>
          )}
          <Notes notes={card.notes} />
        </section>
      );
    case 'memory':
      return (
        <section className="card" aria-label="What Moisha remembers">
          <Rows rows={card.rows} />
          <Notes notes={card.notes} />
        </section>
      );
  }
}
