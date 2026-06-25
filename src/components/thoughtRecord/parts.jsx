import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/constants/theme';
import { pastel, GlossyCircle } from '@/components';
import { FEELINGS } from '@/utils';

/* Shared building blocks for the CBT Thought Record — used by the create flow
 * (ThoughtRecord), the editable detail (ThoughtRecordDetail) and the animated
 * Before/After reveal. Styled to match the Home screen's pastel-glass look. */

export const BEFORE = pastel.purpleDeep;   // indigo  → "where you were"
export const NOW = pastel.heroPink;        // pink    → "where you are now"
export const BEFORE_GRAD = [pastel.heroBlue, pastel.heroPurple];
export const NOW_GRAD = [pastel.coral, pastel.heroPink];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const STEPS = [
  { key: 'situation', col: 1, title: 'Situation / Trigger', icon: 'map-marker-radius',
    prompt: 'Briefly describe the situation that led to these feelings.',
    example: 'For example, "a work presentation."',
    placeholder: 'What happened? Where? When? Who with? How?' },
  { key: 'feelingsBefore', col: 2, title: 'Feelings', icon: 'heart-pulse', kind: 'feelings',
    prompt: 'What did you feel — and how intense was it?',
    example: 'For example, "anxiety, guilt, doubt, fear."',
    placeholder: 'What did I notice in my body? Where did I feel it?' },
  { key: 'thought', col: 3, title: 'Unhelpful Thought', icon: 'cloud-outline', kind: 'thought',
    prompt: 'Identify the negative "hot thought" behind your feelings.',
    example: 'For example, "my presentation will go horribly and my boss will think I\'m bad at my job."',
    placeholder: 'What went through my mind? What\'s the worst that could happen?' },
  { key: 'evidenceFor', col: 4, title: 'Evidence for the thought', icon: 'thumb-up-outline',
    prompt: 'Find the facts that support your unhelpful thought.',
    example: 'For example, "I didn\'t prepare as much as I should have."',
    placeholder: 'What facts do I have that the thought is totally true?' },
  { key: 'evidenceAgainst', col: 5, title: 'Evidence against the thought', icon: 'thumb-down-outline',
    prompt: 'Find the facts that provide evidence against it.',
    example: 'For example, "I\'ve practiced and improved. Everyone has off days."',
    placeholder: 'What facts show it\'s NOT totally true? Is it opinion, not fact?' },
  { key: 'balanced', col: 6, title: 'Balanced perspective', icon: 'scale-balance',
    prompt: 'Now weigh it up — write a healthier, more balanced thought.',
    example: 'For example, "I\'ve prepared, and I have no proof this won\'t go well."',
    placeholder: 'STOPP. What would I tell a friend? What\'s the bigger picture?' },
  { key: 'feelingsNow', col: 7, title: 'Outcome', icon: 'weather-sunny', kind: 'feelings',
    prompt: 'Re-rate how you feel now.',
    example: 'For example, "calmer, reassured, less anxious."',
    placeholder: 'What am I feeling now? What could I do differently?' },
];

export const emptyAnswers = () => ({
  situation: '', feelingsBefore: [], noteBefore: '',
  thought: '', belief: 70, evidenceFor: '', evidenceAgainst: '',
  balanced: '', feelingsNow: [], noteNow: '',
});

export const fmtFeelings = (arr) => (arr && arr.length ? arr.map((f) => `${f.name} (${f.intensity}/10)`).join(', ') : '—');

export const buildContent = (a) => (
  `SITUATION / TRIGGER\n${a.situation?.trim() || '—'}\n\n` +
  `FEELINGS — BEFORE\n${fmtFeelings(a.feelingsBefore)}${a.noteBefore?.trim() ? `\n${a.noteBefore.trim()}` : ''}\n\n` +
  `UNHELPFUL THOUGHT (believed ${a.belief}%)\n${a.thought?.trim() || '—'}\n\n` +
  `EVIDENCE FOR\n${a.evidenceFor?.trim() || '—'}\n\n` +
  `EVIDENCE AGAINST\n${a.evidenceAgainst?.trim() || '—'}\n\n` +
  `BALANCED THOUGHT\n${a.balanced?.trim() || '—'}\n\n` +
  `OUTCOME — NOW\n${fmtFeelings(a.feelingsNow)}${a.noteNow?.trim() ? `\n${a.noteNow.trim()}` : ''}`
);

export const buildStructured = (a) => JSON.stringify({ kind: 'THOUGHT_RECORD', v: 1, ...a });

export const parseStructured = (entry) => {
  if (!entry?.structuredData) return null;
  try {
    const obj = JSON.parse(entry.structuredData);
    if (obj?.kind !== 'THOUGHT_RECORD') return null;
    return { ...emptyAnswers(), ...obj };
  } catch {
    return null;
  }
};

// Dependency-free slider on the RN responder system, with a gradient fill + white thumb.
export const Slider = ({ value, min, max, step = 1, onChange, fill, gradient }) => {
  const widthRef = useRef(1);
  const handle = (e) => {
    const x = e.nativeEvent.locationX;
    const ratio = clamp(x / widthRef.current, 0, 1);
    const snapped = clamp(Math.round((min + ratio * (max - min)) / step) * step, min, max);
    if (snapped !== value) onChange(snapped);
  };
  const pct = ((value - min) / (max - min)) * 100;
  const grad = gradient || [fill, fill];
  return (
    <View
      style={s.sliderTrack}
      onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width || 1; }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handle}
      onResponderMove={handle}
    >
      <View style={s.sliderRail} />
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.sliderFill, { width: `${pct}%` }]} />
      <View style={[s.sliderThumb, { left: `${pct}%`, borderColor: fill }]} />
    </View>
  );
};

const FeelingRow = ({ item, accent, gradient, onChange, onRemove }) => (
  <View style={s.feelingRow}>
    <View style={s.feelingRowHead}>
      <View style={[s.feelingTag, { backgroundColor: accent + '22' }]}>
        <Text style={[s.feelingTagText, { color: accent }]}>{item.name}</Text>
      </View>
      <Text style={s.intensityValue}>{item.intensity}/10</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialIcons name="close" size={18} color={pastel.textMuted} />
      </TouchableOpacity>
    </View>
    <Slider value={item.intensity} min={1} max={10} fill={accent} gradient={gradient} onChange={(v) => onChange({ ...item, intensity: v })} />
  </View>
);

export const FeelingPicker = ({ feelings, setFeelings, note, setNote, accent, gradient, placeholder }) => {
  const [query, setQuery] = useState('');
  const selectedNames = feelings.map((f) => f.name.toLowerCase());
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FEELINGS.filter((f) => !selectedNames.includes(f.toLowerCase()) && (!q || f.toLowerCase().includes(q)));
  }, [query, feelings]);
  const add = (name) => {
    const clean = name.trim();
    if (!clean || selectedNames.includes(clean.toLowerCase())) return;
    setFeelings([...feelings, { name: clean, intensity: 5 }]);
    setQuery('');
  };
  const exactExists = FEELINGS.some((f) => f.toLowerCase() === query.trim().toLowerCase())
    || selectedNames.includes(query.trim().toLowerCase());

  return (
    <View>
      <View style={s.searchBox}>
        <MaterialIcons name="search" size={18} color={pastel.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search or type a feeling…"
                   placeholderTextColor={pastel.textMuted} style={s.searchInput}
                   onSubmitEditing={() => add(query)} returnKeyType="done" />
        {query.trim().length > 0 && !exactExists && (
          <TouchableOpacity onPress={() => add(query)} style={[s.addPill, { backgroundColor: accent }]}>
            <Text style={s.addPillText}>Add "{query.trim()}"</Text>
          </TouchableOpacity>
        )}
      </View>
      {suggestions.length > 0 && (
        <View style={s.suggestRow}>
          {suggestions.slice(0, 8).map((f) => (
            <TouchableOpacity key={f} style={s.suggestChip} onPress={() => add(f)}>
              <Text style={s.suggestChipText}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {feelings.length > 0 && (
        <View style={{ marginTop: theme.spacing.sm }}>
          {feelings.map((f, i) => (
            <FeelingRow key={f.name} item={f} accent={accent} gradient={gradient}
                        onChange={(u) => setFeelings(feelings.map((x, idx) => (idx === i ? u : x)))}
                        onRemove={() => setFeelings(feelings.filter((_, idx) => idx !== i))} />
          ))}
        </View>
      )}
      <TextInput value={note} onChangeText={setNote} placeholder={placeholder}
                 placeholderTextColor={pastel.textMuted} style={s.noteArea} multiline textAlignVertical="top" />
    </View>
  );
};

// The editable input(s) for a given column. `patch` merges into the answers object.
export const StepInput = ({ step, answers, patch }) => {
  if (step.kind === 'feelings') {
    const isNow = step.key === 'feelingsNow';
    return (
      <FeelingPicker
        feelings={isNow ? answers.feelingsNow : answers.feelingsBefore}
        setFeelings={(v) => patch(isNow ? { feelingsNow: v } : { feelingsBefore: v })}
        note={isNow ? answers.noteNow : answers.noteBefore}
        setNote={(v) => patch(isNow ? { noteNow: v } : { noteBefore: v })}
        accent={isNow ? NOW : BEFORE}
        gradient={isNow ? NOW_GRAD : BEFORE_GRAD}
        placeholder={step.placeholder}
      />
    );
  }
  if (step.kind === 'thought') {
    return (
      <View>
        <TextInput value={answers.thought} onChangeText={(v) => patch({ thought: v })}
                   placeholder={step.placeholder} placeholderTextColor={pastel.textMuted}
                   style={s.textArea} multiline textAlignVertical="top" />
        <View style={s.beliefHead}>
          <Text style={s.beliefLabel}>How much do you believe this thought?</Text>
          <Text style={[s.beliefValue, { color: BEFORE }]}>{answers.belief}%</Text>
        </View>
        <Slider value={answers.belief} min={0} max={100} step={5} fill={BEFORE} gradient={BEFORE_GRAD} onChange={(v) => patch({ belief: v })} />
      </View>
    );
  }
  return (
    <TextInput value={answers[step.key]} onChangeText={(v) => patch({ [step.key]: v })}
               placeholder={step.placeholder} placeholderTextColor={pastel.textMuted}
               style={s.textArea} multiline textAlignVertical="top" />
  );
};

// Read-only rendering of a column's answer.
export const StepReadView = ({ step, answers }) => {
  if (step.kind === 'feelings') {
    const isNow = step.key === 'feelingsNow';
    const feelings = isNow ? answers.feelingsNow : answers.feelingsBefore;
    const note = isNow ? answers.noteNow : answers.noteBefore;
    const accent = isNow ? NOW : BEFORE;
    return (
      <View>
        {feelings?.length ? (
          <View style={s.readTagWrap}>
            {feelings.map((f) => (
              <View key={f.name} style={[s.readTag, { backgroundColor: accent + '1f' }]}>
                <Text style={[s.readTagText, { color: accent }]}>{f.name}</Text>
                <Text style={s.readTagInt}>{f.intensity}/10</Text>
              </View>
            ))}
          </View>
        ) : <Text style={s.readEmpty}>No feelings added.</Text>}
        {!!note?.trim() && <Text style={s.readBody}>{note.trim()}</Text>}
      </View>
    );
  }
  if (step.kind === 'thought') {
    return (
      <View>
        <Text style={s.readBody}>{answers.thought?.trim() || '—'}</Text>
        <View style={[s.beliefBadge, { backgroundColor: BEFORE + '1a' }]}>
          <MaterialCommunityIcons name="gauge" size={14} color={BEFORE} />
          <Text style={[s.beliefBadgeText, { color: BEFORE }]}>Believed {answers.belief}%</Text>
        </View>
      </View>
    );
  }
  return <Text style={s.readBody}>{answers[step.key]?.trim() || '—'}</Text>;
};

// Prominent prompt header — the question is the hero, the example is a quiet hint.
export const StepPrompt = ({ step }) => {
  const accent = step.key === 'feelingsNow' ? NOW : pastel.purpleDeep;
  return (
    <View style={s.promptWrap}>
      <View style={s.promptLabelRow}>
        <GlossyCircle size={26} backgroundColor={accent + '33'} style={{ borderRadius: 9 }}>
          <MaterialCommunityIcons name={step.icon} size={15} color={accent} />
        </GlossyCircle>
        <Text style={[s.promptLabel, { color: accent }]}>STEP {step.col} · {step.title.toUpperCase()}</Text>
      </View>
      <Text style={s.promptText}>{step.prompt}</Text>
      <Text style={s.promptExample}>{step.example}</Text>
    </View>
  );
};

// Compact before/after cards (used in the editable detail's last page).
export const SummaryCards = ({ answers }) => (
  <View>
    <LinearGradient colors={BEFORE_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.compareCard}>
      <Text style={s.compareTag}>WHERE YOU WERE</Text>
      <Text style={s.compareLabelLight}>You felt</Text>
      <Text style={s.compareValueLight}>{fmtFeelings(answers.feelingsBefore)}</Text>
      {!!answers.noteBefore?.trim() && <Text style={s.compareNoteLight}>{answers.noteBefore.trim()}</Text>}
      <View style={s.compareDivider} />
      <Text style={s.compareLabelLight}>Unhelpful thought · believed {answers.belief}%</Text>
      <Text style={s.compareValueLight}>{answers.thought?.trim() || '—'}</Text>
    </LinearGradient>
    <View style={s.arrowWrap}><MaterialCommunityIcons name="arrow-down" size={22} color={pastel.textMuted} /></View>
    <LinearGradient colors={NOW_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.compareCard}>
      <Text style={s.compareTag}>WHERE YOU ARE NOW</Text>
      <Text style={s.compareLabelLight}>Balanced thought</Text>
      <Text style={s.compareValueLight}>{answers.balanced?.trim() || '—'}</Text>
      <View style={s.compareDivider} />
      <Text style={s.compareLabelLight}>You feel now</Text>
      <Text style={s.compareValueLight}>{fmtFeelings(answers.feelingsNow)}</Text>
      {!!answers.noteNow?.trim() && <Text style={s.compareNoteLight}>{answers.noteNow.trim()}</Text>}
    </LinearGradient>
  </View>
);

// Circle step indicator (current is filled + scaled, done shows a check).
export const StepCircles = ({ count, current, accent = pastel.purpleDeep }) => (
  <View style={s.circleRow}>
    {Array.from({ length: count }).map((_, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <View key={i} style={[
          s.circle,
          done && { backgroundColor: accent, borderColor: accent },
          active && { borderColor: accent, transform: [{ scale: 1.18 }], backgroundColor: accent + '22' },
        ]}>
          {done
            ? <MaterialIcons name="check" size={11} color="#fff" />
            : <Text style={[s.circleNum, active && { color: accent, fontWeight: '800' }]}>{i + 1}</Text>}
        </View>
      );
    })}
  </View>
);

export const s = StyleSheet.create({
  // inputs
  textArea: { minHeight: 130, backgroundColor: pastel.glassFillStrong, borderRadius: 18, borderWidth: 1, borderColor: pastel.glassBorder, padding: theme.spacing.md, fontSize: theme.typography.fontSize.paragraph.md, color: pastel.textDeep, lineHeight: 22 },
  noteArea: { minHeight: 80, backgroundColor: pastel.glassFillStrong, borderRadius: 18, borderWidth: 1, borderColor: pastel.glassBorder, padding: theme.spacing.md, fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep, marginTop: theme.spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pastel.glassFillStrong, borderRadius: 16, borderWidth: 1, borderColor: pastel.glassBorder, paddingHorizontal: theme.spacing.sm, paddingVertical: 4 },
  searchInput: { flex: 1, fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textDeep, paddingVertical: 9 },
  addPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  addPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: theme.spacing.sm },
  suggestChip: { backgroundColor: pastel.glassFill, borderWidth: 1, borderColor: pastel.glassBorder, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  suggestChipText: { fontSize: 12.5, fontWeight: '600', color: pastel.textDeep },
  // feeling card — roomier
  feelingRow: { backgroundColor: pastel.glassFillStrong, borderRadius: 18, borderWidth: 1, borderColor: pastel.glassBorder, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  feelingRowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: theme.spacing.md },
  feelingTag: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 },
  feelingTagText: { fontSize: 13, fontWeight: '700' },
  intensityValue: { marginLeft: 'auto', fontSize: 13, fontWeight: '800', color: pastel.textMuted },
  // slider
  sliderTrack: { height: 26, justifyContent: 'center' },
  sliderRail: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: 'rgba(123,107,165,0.18)' },
  sliderFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3 },
  sliderThumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', borderWidth: 3, marginLeft: -10, top: 3, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 3, elevation: 3 },
  // belief
  beliefHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.md, marginBottom: 8 },
  beliefLabel: { fontSize: 13, fontWeight: '600', color: pastel.textDeep, flex: 1 },
  beliefValue: { fontSize: 17, fontWeight: '800' },
  // prompt header
  promptWrap: { marginBottom: theme.spacing.md },
  promptLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.sm },
  promptLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  promptText: { fontSize: theme.typography.fontSize.heading.sm, fontWeight: '800', color: pastel.textDeep, lineHeight: 28 },
  promptExample: { fontSize: 13, fontStyle: 'italic', color: pastel.textMuted, marginTop: 6, lineHeight: 19 },
  // read view
  readBody: { fontSize: 16, lineHeight: 24, color: pastel.textDeep },
  readEmpty: { fontSize: 14, color: pastel.textMuted, fontStyle: 'italic' },
  readTagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  readTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  readTagText: { fontSize: 13, fontWeight: '700' },
  readTagInt: { fontSize: 12, fontWeight: '700', color: pastel.textMuted },
  beliefBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, marginTop: 14 },
  beliefBadgeText: { fontSize: 13, fontWeight: '700' },
  // summary cards
  compareCard: { borderRadius: 22, padding: theme.spacing.lg, shadowColor: pastel.purpleDeep, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  compareTag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: 'rgba(255,255,255,0.85)', marginBottom: theme.spacing.sm },
  compareLabelLight: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.8)', marginBottom: 4, marginTop: 4 },
  compareValueLight: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: '#fff' },
  compareNoteLight: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  compareDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: theme.spacing.md },
  arrowWrap: { alignItems: 'center', paddingVertical: 8 },
  // circles
  circleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: theme.spacing.md },
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(123,107,165,0.4)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  circleNum: { fontSize: 10, fontWeight: '700', color: pastel.textMuted },
});