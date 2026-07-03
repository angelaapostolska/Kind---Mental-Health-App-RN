import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useGetInsightTodayQuery } from '@/api/api';
import { pastel } from '@/components';
import { useAppSelector } from '@/store/store';

// Maps rule-based signals to a plain-language mood word shown in the header line.
const MOOD_WORD = {
  DECLINING_ELEVATED_CONCERN: 'quite low',
  DECLINING_MODERATE:         'somewhat low',
  DECLINING_LOW_RISK:         'a bit down',
  STABLE_MODERATE:            'mixed',
  STABLE_LOW_RISK:            'balanced',
  STABLE_ELEVATED_CONCERN:    'heavy',
  IMPROVING_LOW_RISK:         'more uplifting',
  IMPROVING_MODERATE:         'more uplifting',
  IMPROVING_ELEVATED_CONCERN: 'gradually better',
  CRISIS_FLAG:                'very heavy',
};

const moodWord = (trend, severity) => {
  if (severity === 'CRISIS_FLAG') return MOOD_WORD.CRISIS_FLAG;
  return MOOD_WORD[`${trend}_${severity}`] ?? 'varied';
};

const CARD_GRADIENT   = ['#FFCBA4', '#C8A5F5', '#8EC5FC'];
const CRISIS_GRADIENT = ['#FFB8C6', '#E8A0BF', '#C48DD9'];

const MoodInsightCard = () => {
  const userId = useAppSelector((state) => state.userState.userId);
  const { data, isLoading, isError } = useGetInsightTodayQuery(undefined, { skip: !userId });

  if (isLoading) {
    return (
      <LinearGradient colors={CARD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.loadingInner}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.loadingText}>Getting your insight…</Text>
        </View>
      </LinearGradient>
    );
  }

  if (isError || !data) return null;

  const trend    = data.ruleBasedInsight?.moodTrend ?? 'STABLE';
  const severity = data.ruleBasedInsight?.severity  ?? 'LOW_RISK';
  const isCrisis = severity === 'CRISIS_FLAG';
  const word     = moodWord(trend, severity);

  return (
    <LinearGradient
      colors={isCrisis ? CRISIS_GRADIENT : CARD_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* top-left gloss blob */}
      <View style={styles.glossBlob} pointerEvents="none" />

      {/* reflection sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.55, y: 0.7 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]}
        pointerEvents="none"
      />

      {/* sparkle accents */}
      <MaterialCommunityIcons
        name="star-four-points"
        size={13}
        color="#fff"
        style={styles.sparkleTopRight}
        pointerEvents="none"
      />
      <MaterialCommunityIcons
        name="star-four-points"
        size={9}
        color="#fff"
        style={styles.sparkleBottomRight}
        pointerEvents="none"
      />

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <Text style={styles.starEmoji}>✨</Text>
        <Text style={styles.headline}>Your mood insight</Text>
      </View>

      {/* ── Summary line (rule-based) ── */}
      <Text style={styles.summaryLine}>
        You've been recording{' '}
        <Text style={styles.summaryBold}>{word}</Text>
        {' '}moods over the past 7 days.
      </Text>

      {/* ── LLM feeling summary ── */}
      <Text style={styles.feelingText}>{data.feelingSummary}</Text>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Recommendation ── */}
      <Text style={styles.tryLabel}>Maybe try this…</Text>
      <Text style={styles.recText}>{data.recommendation}</Text>

      {/* ── Why this helps ── */}
      {!!data.reason && (
        <View style={styles.whyRow}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={14}
            color="rgba(255,255,255,0.85)"
            style={{ marginTop: 1 }}
          />
          <Text style={styles.whyText}>{data.reason}</Text>
        </View>
      )}

      {/* ── Source badge ── */}
      {data.source === 'LLM' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✦ AI-powered</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: pastel.purpleDeep,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  glossBlob: {
    position: 'absolute',
    top: -28,
    left: -22,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,1)',
    opacity: 0.38,
  },
  sparkleTopRight: {
    position: 'absolute',
    top: 18,
    right: 22,
    opacity: 0.7,
  },
  sparkleBottomRight: {
    position: 'absolute',
    bottom: 26,
    right: 44,
    opacity: 0.5,
  },
  loadingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  starEmoji: {
    fontSize: 20,
  },
  headline: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  summaryLine: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 6,
    lineHeight: 19,
  },
  summaryBold: {
    fontWeight: '800',
    color: '#fff',
  },
  feelingText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 14,
  },
  tryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 7,
  },
  recText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 21,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  whyText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  badge: {
    alignSelf: 'flex-end',
    marginTop: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
});

export default MoodInsightCard;
