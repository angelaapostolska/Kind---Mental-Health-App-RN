import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { pastel } from '@/components';
import { theme } from '@/constants/theme';
import { BEFORE_GRAD, NOW_GRAD } from '@/components/thoughtRecord/parts';

// Fade + rise on mount; remounts (via `key`) replay the animation per stage.
const Reveal = ({ delay = 0, children, style }) => {
  const o = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    const a = Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 520, delay, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 520, delay, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, []);
  return <Animated.View style={[style, { opacity: o, transform: [{ translateY: ty }] }]}>{children}</Animated.View>;
};

const PulseHint = ({ children }) => {
  const o = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 950, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.45, duration: 950, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={{ opacity: o }}>{children}</Animated.View>;
};

const Chips = ({ feelings }) => (
  <View style={st.chipWrap}>
    {feelings?.length ? feelings.map((f) => (
      <View key={f.name} style={st.chip}>
        <Text style={st.chipName}>{f.name}</Text>
        <Text style={st.chipInt}>{f.intensity}/10</Text>
      </View>
    )) : <Text style={st.value}>—</Text>}
  </View>
);

const BeforeAfterReveal = ({ answers, onBack, onSave, saving }) => {
  const [stage, setStage] = useState('before');

  const back = () => (stage === 'now' ? setStage('before') : onBack());

  return (
    <LinearGradient
      colors={stage === 'before' ? BEFORE_GRAD : NOW_GRAD}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {/* tap anywhere on the "before" stage to advance */}
      <Pressable style={{ flex: 1 }} onPress={() => stage === 'before' && setStage('now')}>
        <ScrollView contentContainerStyle={st.page} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={back} style={st.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {stage === 'before' ? (
            <View key="before">
              <Reveal delay={150}>
                <Text style={st.eyebrow}>WHERE YOU STARTED</Text>
              </Reveal>
              <Reveal delay={550} style={st.block}>
                <Text style={st.label}>You felt</Text>
                <Chips feelings={answers.feelingsBefore} />
                {!!answers.noteBefore?.trim() && <Text style={st.note}>{answers.noteBefore.trim()}</Text>}
              </Reveal>
              <Reveal delay={1000} style={st.block}>
                <Text style={st.label}>And you thought</Text>
                <Text style={st.thought}>"{answers.thought?.trim() || '—'}"</Text>
                <View style={st.believePill}>
                  <MaterialCommunityIcons name="gauge" size={14} color="#fff" />
                  <Text style={st.believeText}>Believed {answers.belief}%</Text>
                </View>
              </Reveal>
              <Reveal delay={1550} style={st.hintWrap}>
                <PulseHint>
                  <View style={st.hintRow}>
                    <Text style={st.hint}>Tap anywhere to see where you are now</Text>
                    <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                  </View>
                </PulseHint>
              </Reveal>
            </View>
          ) : (
            <View key="now">
              <Reveal delay={150}>
                <Text style={st.eyebrow}>WHERE YOU ARE NOW</Text>
              </Reveal>
              <Reveal delay={550} style={st.block}>
                <Text style={st.label}>A more balanced thought</Text>
                <Text style={st.thought}>"{answers.balanced?.trim() || '—'}"</Text>
              </Reveal>
              <Reveal delay={1000} style={st.block}>
                <Text style={st.label}>You feel now</Text>
                <Chips feelings={answers.feelingsNow} />
                {!!answers.noteNow?.trim() && <Text style={st.note}>{answers.noteNow.trim()}</Text>}
              </Reveal>
              <Reveal delay={1500} style={{ marginTop: theme.spacing.xl }}>
                <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving} activeOpacity={0.85}>
                  <MaterialIcons name="check" size={18} color={pastel.heroPink} />
                  <Text style={st.saveText}>{saving ? 'Saving…' : 'Save thought record'}</Text>
                </TouchableOpacity>
              </Reveal>
            </View>
          )}
        </ScrollView>
      </Pressable>
    </LinearGradient>
  );
};

const st = StyleSheet.create({
  page: { padding: theme.spacing.xl, paddingTop: theme.spacing.xxl, minHeight: '100%', justifyContent: 'center' },
  backBtn: { position: 'absolute', top: theme.spacing.md, left: theme.spacing.md, width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: theme.spacing.lg },
  block: { marginBottom: theme.spacing.xl },
  label: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: theme.spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 18, color: '#fff', fontWeight: '700' },
  thought: { fontSize: theme.typography.fontSize.heading.sm, lineHeight: 30, color: '#fff', fontWeight: '800' },
  note: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.9)', marginTop: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  chipName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  chipInt: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  believePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, marginTop: 12 },
  believeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  hintWrap: { marginTop: theme.spacing.md, alignItems: 'center' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { color: '#fff', fontSize: 14, fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  saveText: { color: pastel.heroPink, fontSize: 15, fontWeight: '800' },
});

export default BeforeAfterReveal;