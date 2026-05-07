import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MeasurementTable } from '../components/MeasurementTable';
import { StatusIndicator } from '../components/StatusIndicator';
import {
  MEASUREMENT_ROWS,
  applyFieldsToRows,
  buildFields,
} from '../data/sampleFields';
import { useVoiceFlow } from '../hooks/useVoiceFlow';
import type { Field, MeasurementRow } from '../types';

const PersonalInfoScreen: React.FC = () => {
  const [rows, setRows] = useState<MeasurementRow[]>(MEASUREMENT_ROWS);
  const [fields, setFields] = useState<Field[]>(buildFields(MEASUREMENT_ROWS));
  const [audioPrompts, setAudioPrompts] = useState(true); // Prompted by default

  // Sync voice engine's flat fields back onto the table rows
  const handleSetFields = useCallback(
    (updater: React.SetStateAction<Field[]>) => {
      setFields(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        setRows(r => applyFieldsToRows(r, next));
        return next;
      });
    },
    [],
  );

  const {
    appState,
    running,
    currentIndex,
    errorMsg,
    partialTranscript,
    lastTranscript,
    start,
    stop,
    repeat,
    skip,
    back,
  } = useVoiceFlow({
    fields,
    setFields: handleSetFields,
    audioPrompts,
    onComplete: () => {
      console.log('[CompassTex] Measurement entry complete', rows);
    },
  });

  const onToggle = useCallback(() => {
    if (running) { stop(); } else { start(); }
  }, [running, start, stop]);

  const onSave = useCallback(() => {
    console.log('[CompassTex] Save', rows);
  }, [rows]);

  const currentField = fields[currentIndex];
  const currentRow   = Math.floor(currentIndex / 10) + 1;
  const currentCol   = (currentIndex % 10) + 1;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.brand}>COMPASS TEX</Text>
          <Text style={styles.subtitle}>Measurement entry — voice</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerBtn} onPress={onSave}>
            <Text style={styles.headerBtnText}>SAVE</Text>
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={stop}>
            <Text style={styles.headerBtnText}>CLOSE</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Mode toggle ──────────────────────────────────── */}
      <View style={styles.modeRow}>
        <Text style={styles.modeLabel}>Mode:</Text>
        <Pressable
          style={[styles.modeBtn, !audioPrompts && styles.modeBtnActive]}
          onPress={() => setAudioPrompts(false)}
          disabled={running}>
          <Text style={[styles.modeBtnTxt, !audioPrompts && styles.modeBtnTxtActive]}>
            ⚡ Fast
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, audioPrompts && styles.modeBtnActive]}
          onPress={() => setAudioPrompts(true)}
          disabled={running}>
          <Text style={[styles.modeBtnTxt, audioPrompts && styles.modeBtnTxtActive]}>
            🔊 Prompted
          </Text>
        </Pressable>
      </View>

      {/* ── Active field indicator ───────────────────────── */}
      {running && currentField ? (
        <View style={styles.activeBox}>
          <Text style={styles.activePos}>Row {currentRow}  ·  Col {currentCol} of 10</Text>
          <Text style={styles.activeField}>{currentField.label}</Text>
        </View>
      ) : (
        <View style={styles.activeBox}>
          <Text style={styles.idleHint}>
            {audioPrompts
              ? '🔊 Prompted — app reads each field aloud'
              : '⚡ Fast — speak values row by row, left to right'}
          </Text>
        </View>
      )}

      {/* ── "What I heard" ───────────────────────────────── */}
      <View style={styles.heardBox}>
        <Text style={styles.heardLabel}>WHAT I HEARD</Text>
        {partialTranscript ? (
          <Text style={styles.heardPartial}>{partialTranscript}…</Text>
        ) : lastTranscript ? (
          <Text style={styles.heardFinal}>{lastTranscript}</Text>
        ) : (
          <Text style={styles.heardEmpty}>{running ? 'Listening…' : '—'}</Text>
        )}
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTxt}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* ── Start / Stop ─────────────────────────────────── */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.bigBtn,
          { backgroundColor: running ? '#ef4444' : '#2563eb', opacity: pressed ? 0.85 : 1 },
        ]}>
        <Text style={styles.bigBtnTxt}>
          {running ? '■ Stop' : '▶ Start voice entry'}
        </Text>
      </Pressable>

      {/* ── Manual controls ──────────────────────────────── */}
      <View style={styles.ctrlRow}>
        <Pressable style={[styles.ctrl, !running && styles.ctrlOff]} disabled={!running} onPress={repeat}>
          <Text style={styles.ctrlTxt}>🔁 Repeat</Text>
        </Pressable>
        <Pressable style={[styles.ctrl, !running && styles.ctrlOff]} disabled={!running} onPress={skip}>
          <Text style={styles.ctrlTxt}>⏭ Skip</Text>
        </Pressable>
        <Pressable style={[styles.ctrl, !running && styles.ctrlOff]} disabled={!running} onPress={back}>
          <Text style={styles.ctrlTxt}>⏮ Back</Text>
        </Pressable>
      </View>

      {/* ── Measurement table ────────────────────────────── */}
      <MeasurementTable
        rows={rows}
        fields={fields}
        activeFieldIndex={currentIndex}
        isActive={running}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 12, paddingBottom: 80 },

  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
    backgroundColor: '#0f172a', padding: 12, borderRadius: 8,
  },
  brand:    { fontSize: 18, fontWeight: '800', color: '#f8fafc', letterSpacing: 1 },
  subtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  headerActions: { flexDirection: 'row' },
  headerBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#1e293b', borderRadius: 6, marginLeft: 6,
  },
  headerBtnText: { fontSize: 12, fontWeight: '700', color: '#f8fafc' },

  modeRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  modeLabel: { fontSize: 12, color: '#475569' },
  modeBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 7,
    backgroundColor: '#e2e8f0', alignItems: 'center',
  },
  modeBtnActive:   { backgroundColor: '#2563eb' },
  modeBtnTxt:      { fontSize: 13, fontWeight: '600', color: '#475569' },
  modeBtnTxtActive:{ color: '#fff' },

  activeBox: {
    backgroundColor: '#fff', padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8,
  },
  activePos:   { fontSize: 10, color: '#64748b' },
  activeField: { fontSize: 14, fontWeight: '700', color: '#1d4ed8', marginTop: 2 },
  idleHint:    { fontSize: 12, color: '#94a3b8' },

  heardBox: {
    padding: 12, borderRadius: 8, backgroundColor: '#0f172a',
    minHeight: 58, marginBottom: 8,
  },
  heardLabel:   { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#94a3b8', marginBottom: 3 },
  heardPartial: { fontSize: 18, color: '#60a5fa', fontStyle: 'italic' },
  heardFinal:   { fontSize: 18, color: '#f8fafc', fontWeight: '600' },
  heardEmpty:   { fontSize: 13, color: '#64748b' },

  errorBox: {
    backgroundColor: '#fef2f2', padding: 8, borderRadius: 6,
    marginBottom: 8, borderWidth: 1, borderColor: '#fecaca',
  },
  errorTxt: { color: '#b91c1c', fontSize: 12 },

  bigBtn: {
    paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginBottom: 8,
  },
  bigBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  ctrlRow: { flexDirection: 'row', marginBottom: 4, gap: 6 },
  ctrl: {
    flex: 1, paddingVertical: 8, borderRadius: 7,
    backgroundColor: '#e2e8f0', alignItems: 'center',
  },
  ctrlOff: { opacity: 0.4 },
  ctrlTxt: { fontSize: 11, color: '#0f172a', fontWeight: '600' },
});

export default PersonalInfoScreen;
