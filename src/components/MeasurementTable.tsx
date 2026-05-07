/**
 * MeasurementTable — scrollable horizontal table matching Compass Tex layout.
 *
 * Columns: Measurement | Tol+ | Tol- | S | D1 | D2 | D3 | D4 | M | D1 | D2 | D3 | D4
 * Active cell is highlighted in blue.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Field, MeasurementRow } from '../types';

interface Props {
  rows: MeasurementRow[];
  fields: Field[];           // flat voice fields to read current active cell
  activeFieldIndex: number;
  isActive: boolean;
}

type CellKey =
  | 's' | 'sDiff1' | 'sDiff2' | 'sDiff3' | 'sDiff4'
  | 'm' | 'mDiff1' | 'mDiff2' | 'mDiff3' | 'mDiff4';

const CELL_ORDER: CellKey[] = [
  's', 'sDiff1', 'sDiff2', 'sDiff3', 'sDiff4',
  'm', 'mDiff1', 'mDiff2', 'mDiff3', 'mDiff4',
];

const CELLS_PER_ROW = CELL_ORDER.length; // 10

const COL_HEADERS = ['S', 'D1', 'D2', 'D3', 'D4', 'M', 'D1', 'D2', 'D3', 'D4'];

// Column widths
const W_MEASURE = 180;
const W_TOL     = 36;
const W_CELL    = 42;

export const MeasurementTable: React.FC<Props> = ({
  rows,
  activeFieldIndex,
  isActive,
}) => {
  const activeRowIdx  = Math.floor(activeFieldIndex / CELLS_PER_ROW);
  const activeColIdx  = activeFieldIndex % CELLS_PER_ROW;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={styles.outerScroll}>
      <View>
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <Text style={[styles.hCell, { width: W_MEASURE }]}>Measurement</Text>
          <Text style={[styles.hCell, { width: W_TOL }]}>Tol+</Text>
          <Text style={[styles.hCell, { width: W_TOL }]}>Tol−</Text>
          {/* S-group header */}
          <View style={[styles.groupHeader, { width: W_CELL * 5 }]}>
            <Text style={styles.groupLabel}>S</Text>
          </View>
          {/* M-group header */}
          <View style={[styles.groupHeader, { width: W_CELL * 5 }]}>
            <Text style={styles.groupLabel}>M</Text>
          </View>
        </View>

        {/* Sub-header */}
        <View style={styles.subHeaderRow}>
          <Text style={[styles.shCell, { width: W_MEASURE }]} />
          <Text style={[styles.shCell, { width: W_TOL }]} />
          <Text style={[styles.shCell, { width: W_TOL }]} />
          {COL_HEADERS.map((h, i) => (
            <Text key={i} style={[styles.shCell, { width: W_CELL }]}>{h}</Text>
          ))}
        </View>

        {/* ── Data rows ──────────────────────────────────────── */}
        {rows.map((row, rIdx) => {
          const isActiveRow = isActive && rIdx === activeRowIdx;
          return (
            <View
              key={row.id}
              style={[styles.dataRow, rIdx % 2 === 1 && styles.altRow]}>
              {/* Measurement label */}
              <Text
                style={[styles.measureCell, { width: W_MEASURE }, isActiveRow && styles.activeMeasure]}
                numberOfLines={2}>
                {row.label}
              </Text>
              {/* Tolerances */}
              <Text style={[styles.tolCell, { width: W_TOL }]}>{row.tolPlus}</Text>
              <Text style={[styles.tolCell, { width: W_TOL }]}>{row.tolMinus}</Text>
              {/* Value cells */}
              {CELL_ORDER.map((col, cIdx) => {
                const isActiveCell = isActive && rIdx === activeRowIdx && cIdx === activeColIdx;
                const val = row[col];
                return (
                  <View
                    key={col}
                    style={[
                      styles.valueCell,
                      { width: W_CELL },
                      cIdx === 5 && styles.mSeparator, // gap before M group
                      isActiveCell && styles.activeCell,
                    ]}>
                    <Text style={[styles.valueTxt, !val && styles.emptyTxt]}>
                      {val || (isActiveCell ? '▌' : '')}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  outerScroll: { marginTop: 12 },

  // Headers
  headerRow: { flexDirection: 'row', backgroundColor: '#1e293b' },
  hCell: {
    color: '#f8fafc', fontSize: 11, fontWeight: '700',
    paddingVertical: 8, paddingHorizontal: 6, textAlign: 'center',
    borderRightWidth: 1, borderColor: '#334155',
  },
  groupHeader: {
    backgroundColor: '#0f172a',
    justifyContent: 'center', alignItems: 'center',
    borderLeftWidth: 2, borderColor: '#475569',
    paddingVertical: 8,
  },
  groupLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800', letterSpacing: 2 },

  subHeaderRow: { flexDirection: 'row', backgroundColor: '#334155' },
  shCell: {
    color: '#94a3b8', fontSize: 10, fontWeight: '600',
    paddingVertical: 5, textAlign: 'center',
    borderRightWidth: 1, borderColor: '#475569',
  },

  // Data rows
  dataRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  altRow: { backgroundColor: '#f8fafc' },

  measureCell: {
    fontSize: 11, color: '#0f172a',
    paddingVertical: 8, paddingHorizontal: 6,
    borderRightWidth: 1, borderColor: '#e2e8f0',
    justifyContent: 'center',
  },
  activeMeasure: { color: '#1d4ed8', fontWeight: '700' },

  tolCell: {
    fontSize: 11, color: '#64748b', textAlign: 'center',
    paddingVertical: 8,
    borderRightWidth: 1, borderColor: '#e2e8f0',
  },

  valueCell: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7,
    borderRightWidth: 1, borderColor: '#e2e8f0',
    minHeight: 36,
  },
  mSeparator: { borderLeftWidth: 2, borderLeftColor: '#94a3b8' },
  activeCell: { backgroundColor: '#dbeafe' },

  valueTxt: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  emptyTxt: { color: '#d1d5db' },
});
