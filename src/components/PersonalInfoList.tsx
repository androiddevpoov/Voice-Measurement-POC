import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Field } from '../types';

interface Props {
  fields: Field[];
  activeIndex: number;
  isActive: boolean;
}

export const PersonalInfoList: React.FC<Props> = ({
  fields,
  activeIndex,
  isActive,
}) => {
  return (
    <View style={styles.card}>
      {fields.map((f, idx) => {
        const isCurrent = idx === activeIndex && isActive;
        return (
          <View
            key={f.id}
            style={[styles.row, isCurrent && styles.activeRow]}>
            <Text style={styles.label}>{f.label}</Text>
            <Text
              style={[styles.value, !f.value && styles.valueEmpty]}
              numberOfLines={2}>
              {f.value || '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  activeRow: {
    backgroundColor: '#dbeafe',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  value: {
    marginTop: 4,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  valueEmpty: {
    color: '#cbd5e1',
    fontWeight: '400',
  },
});
