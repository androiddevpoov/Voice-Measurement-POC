import type { Field, MeasurementRow } from '../types';

const EMPTY = '';

const CELL_SPOKEN: Record<string, string> = {
  s:      'S',
  sDiff1: 'Diff 1', sDiff2: 'Diff 2', sDiff3: 'Diff 3', sDiff4: 'Diff 4',
  m:      'M',
  mDiff1: 'M Diff 1', mDiff2: 'M Diff 2', mDiff3: 'M Diff 3', mDiff4: 'M Diff 4',
};

export const MEASUREMENT_ROWS: MeasurementRow[] = [
  { id: 'r1',  label: 'st.u.p. height at CB',                          spokenLabel: 'Stoop height at CB',                         tolPlus: 1,   tolMinus: -1,   s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r2',  label: 'Sleeve length (fm shoulder)',                    spokenLabel: 'Sleeve length from shoulder, short sleeve',   tolPlus: 1,   tolMinus: -1,   s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r3',  label: 'Armhole (inside, straight)',                     spokenLabel: 'Armhole inside measured straight',            tolPlus: 1,   tolMinus: -1,   s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r4',  label: 'Upperarm width',                                 spokenLabel: 'Upperarm width',                             tolPlus: 1,   tolMinus: -1,   s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r5',  label: 'Underarm width (20cm above)',                    spokenLabel: 'Underarm width, 20 centimeters above',       tolPlus: 1,   tolMinus: -1,   s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r6',  label: 'Shoulder seam from HPSG',                       spokenLabel: 'Shoulder seam from H P S G',                 tolPlus: 1,   tolMinus: -0.5, s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r7',  label: 'Back neck width',                                spokenLabel: 'Back neck width, seam to seam',              tolPlus: 1,   tolMinus: -0.5, s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r8',  label: 'Neck drop front',                                spokenLabel: 'Neck drop front',                            tolPlus: 1,   tolMinus: -0.5, s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r9',  label: 'Neck drop back',                                 spokenLabel: 'Neck drop back',                             tolPlus: 0.5, tolMinus: -0.5, s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r10', label: 'Collar height (back)',                            spokenLabel: 'Collar height back',                         tolPlus: 0.2, tolMinus: -0.2, s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
  { id: 'r11', label: 'Collar height CF',                               spokenLabel: 'Collar height C F',                          tolPlus: 0.2, tolMinus: -0.2, s: EMPTY, sDiff1: EMPTY, sDiff2: EMPTY, sDiff3: EMPTY, sDiff4: EMPTY, m: EMPTY, mDiff1: EMPTY, mDiff2: EMPTY, mDiff3: EMPTY, mDiff4: EMPTY },
];

// ─── Column key → MeasurementRow property mapping ────────────────────────────

type CellKey = keyof Pick<MeasurementRow,
  's' | 'sDiff1' | 'sDiff2' | 'sDiff3' | 'sDiff4' |
  'm' | 'mDiff1' | 'mDiff2' | 'mDiff3' | 'mDiff4'>;

const CELL_ORDER: CellKey[] = [
  's', 'sDiff1', 'sDiff2', 'sDiff3', 'sDiff4',
  'm', 'mDiff1', 'mDiff2', 'mDiff3', 'mDiff4',
];

const CELL_LABEL: Record<CellKey, string> = {
  s:      'S',
  sDiff1: 'S Diff 1', sDiff2: 'S Diff 2', sDiff3: 'S Diff 3', sDiff4: 'S Diff 4',
  m:      'M',
  mDiff1: 'M Diff 1', mDiff2: 'M Diff 2', mDiff3: 'M Diff 3', mDiff4: 'M Diff 4',
};

// ─── Flat Field array for the voice engine ────────────────────────────────────

export function buildFields(rows: MeasurementRow[]): Field[] {
  const fields: Field[] = [];
  rows.forEach(row => {
    CELL_ORDER.forEach((col, cIdx) => {
      // First column of each row: say measurement name + column.
      // Other columns: say only the column name — fast for trained operators.
      const spokenPrompt = cIdx === 0
        ? `${row.spokenLabel}. ${CELL_SPOKEN[col]}.`
        : `${CELL_SPOKEN[col]}.`;
      fields.push({
        id:           `${row.id}_${col}`,
        label:        `${row.label} — ${CELL_LABEL[col]}`,
        spokenPrompt,
        kind:         'number',
        value:        row[col],
      });
    });
  });
  return fields;
}

/** Apply a flat fields update back onto the rows array. */
export function applyFieldsToRows(
  rows: MeasurementRow[],
  fields: Field[],
): MeasurementRow[] {
  const updated = rows.map(r => ({ ...r }));
  fields.forEach(f => {
    const [rowId, ...rest] = f.id.split('_');
    const col = rest.join('_') as CellKey;
    const row = updated.find(r => r.id === rowId);
    if (row && col in row) { (row as any)[col] = f.value; }
  });
  return updated;
}

// Legacy flat SAMPLE_FIELDS kept for backwards compat (not used by new screen)
export const SAMPLE_FIELDS: Field[] = buildFields(MEASUREMENT_ROWS);
