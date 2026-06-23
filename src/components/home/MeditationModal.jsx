import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { GlossyCircle, pastel } from '@/components';
import SwipeDismissSheet from './SwipeDismissSheet';

const SOUND_ICONS = {
  Rain: 'weather-rainy',
  Ocean: 'waves',
  Forest: 'tree',
  'White noise': 'music-note-whole',
};

const SOUNDS = ['Rain', 'Ocean', 'Forest', 'White noise'];

const DURATIONS = [5, 10, 15, 20, 30];

const GUIDED_TYPES = [
  { name: 'Body Scan',       desc: 'Release tension head to toe' },
  { name: 'Loving Kindness', desc: 'Cultivate compassion' },
  { name: 'Focus',           desc: 'Train sustained attention' },
  { name: 'Sleep',           desc: 'Drift off peacefully' },
];

// onStart receives { sound, duration }
const MeditationModal = ({ visible, onClose, onStart }) => {
  const [mode, setMode] = useState('sound');
  const [sound, setSound] = useState('Rain');
  const [duration, setDuration] = useState(5);

  return (
    <SwipeDismissSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Meditation</Text>

      <View style={styles.tabRow}>
        {['sound', 'guided'].map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            style={[styles.tab, mode === m && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'sound' ? 'Sound + Timer' : 'Guided'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'sound' ? (
        <View>
          <Text style={styles.label}>Pick a sound</Text>
          <View style={styles.soundGrid}>
            {SOUNDS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSound(s)}
                style={[styles.soundChip, sound === s && styles.soundChipActive]}
              >
                <MaterialCommunityIcons
                  name={SOUND_ICONS[s] || 'music'}
                  size={14}
                  color={sound === s ? '#fff' : pastel.textDeep}
                />
                <Text style={[styles.soundChipText, sound === s && { color: '#fff' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Duration: {duration} min</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDuration(d)}
                style={[styles.durationChip, duration === d && styles.durationChipActive]}
              >
                <Text style={[styles.durationChipText, duration === d && { color: '#fff' }]}>{d}m</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={() => onStart({ sound, duration })}>
            <Text style={styles.startBtnText}>Start session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {GUIDED_TYPES.map((t) => (
            <TouchableOpacity key={t.name} style={styles.guidedItem}>
              <GlossyCircle size={38} backgroundColor="rgba(183,156,242,0.30)">
                <MaterialCommunityIcons name="brain" size={18} color={pastel.purpleDeep} />
              </GlossyCircle>
              <View style={{ flex: 1 }}>
                <Text style={styles.guidedName}>{t.name}</Text>
                <Text style={styles.guidedDesc}>{t.desc}</Text>
              </View>
              <Text style={styles.aiLabel}>AI</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </SwipeDismissSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: theme.typography.fontSize.paragraph.lg,
    fontWeight: '800', color: pastel.textDeep,
    textAlign: 'center', marginBottom: theme.spacing.md,
  },
  tabRow: {
    flexDirection: 'row', backgroundColor: theme.colors.surface.two,
    borderRadius: 20, padding: 4, marginBottom: theme.spacing.md,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  tabActive: {
    backgroundColor: theme.colors.surface.one,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  tabText: { fontSize: 12, fontWeight: '700', color: pastel.textMuted },
  tabTextActive: { color: pastel.textDeep },
  label: {
    fontSize: 12, fontWeight: '700', color: pastel.textDeep,
    marginBottom: theme.spacing.xs, marginTop: theme.spacing.xs,
  },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.sm },
  soundChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16, backgroundColor: theme.colors.surface.two,
  },
  soundChipActive: { backgroundColor: theme.colors.primary },
  soundChipText: { fontSize: 13, fontWeight: '600', color: pastel.textDeep },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  durationChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, backgroundColor: theme.colors.surface.two,
  },
  durationChipActive: { backgroundColor: theme.colors.primary },
  durationChipText: { fontSize: 12, fontWeight: '600', color: pastel.textDeep },
  startBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20, padding: theme.spacing.md, alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  guidedItem: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface.two,
    borderRadius: 16, padding: theme.spacing.md, marginBottom: 8,
  },
  guidedName: { fontSize: 14, fontWeight: '700', color: pastel.textDeep },
  guidedDesc: { fontSize: 11, color: pastel.textMuted },
  aiLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.primary },
  closeBtn: {
    marginTop: theme.spacing.md, backgroundColor: theme.colors.surface.two,
    borderRadius: 16, padding: theme.spacing.md, alignItems: 'center',
  },
  closeBtnText: { fontWeight: '700', color: pastel.textDeep },
});

export default MeditationModal;
