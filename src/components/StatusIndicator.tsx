import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { AppState } from '../types';

interface Props {
  state: AppState;
}

export const StatusIndicator: React.FC<Props> = ({ state }) => {
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      Animated.loop(
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      dotAnim.stopAnimation();
      dotAnim.setValue(0);
    }
  }, [state, dotAnim]);

  const label = useMemo(() => {
    switch (state) {
      case 'speaking':
        return 'Speaking…';
      case 'listening':
        return 'Listening…';
      case 'processing':
        return 'Processing…';
      default:
        return 'Idle';
    }
  }, [state]);

  const color = useMemo(() => {
    switch (state) {
      case 'speaking':
        return '#f59e0b';
      case 'listening':
        return '#22c55e';
      case 'processing':
        return '#3b82f6';
      default:
        return '#94a3b8';
    }
  }, [state]);

  const opacity = dotAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
      <Animated.Text style={[styles.bouncing, { opacity }]}>
        {state === 'idle' ? '' : '• • •'}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  bouncing: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
});
