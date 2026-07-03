import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // glossy gradient avatar
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
// CHANGED: switched from Glass.jsx's GlassCard/GlossyCircle to the same
// SoftCard/SoftIcon primitives Home and Journal actually use. GlassCard's
// CardShine (fixed-position blob + sparkles) is tuned for big square hero
// cards — on Profile's compact stat tiles / settings rows it landed on top
// of icons and text, same bug we just fixed on the Journal prompt cards.
import { ScreenGradientBackground, pastel } from '@/components';
import { SoftCard, SoftIcon } from '@/components/home/SoftGlass';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setSignedIn } from '@/store/commonSlices/userSlice';
import {
  loadAffirmationSettings,
  applyAffirmationSettings,
  DEFAULT_SETTINGS,
} from '@/utils/notifications';

// 24h -> "9:00 AM"
const formatTime = (h, m) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

// CHANGED: paired each setting with a SoftIcon tint so the row picks up the
// same varied-but-cohesive icon coloring Home uses (mint for meditation,
// purple for the CBT badge, lavender for the prompt lightbulbs) instead of
// four identical purple circles in a row.
const SETTINGS = [
  { icon: 'notifications', label: 'Notifications', desc: 'Reminders & alerts', tint: 'purple' },
  { icon: 'brightness-6', label: 'Appearance', desc: 'Theme & display', tint: 'pink' },
  { icon: 'volume-up', label: 'Sound & Haptics', desc: 'Audio preferences', tint: 'mint' },
  { icon: 'security', label: 'Privacy', desc: 'Data & security', tint: 'blue' },
];

const Profile = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const appState = useAppSelector((s) => s.appState);
  const userName = appState?.userName || 'Friend';
  const initials = userName.slice(0, 2).toUpperCase();

  const [aff, setAff] = useState(DEFAULT_SETTINGS);
  useEffect(() => {
    loadAffirmationSettings().then(setAff);
  }, []);

  const applySettings = async (next) => {
    setAff(next); // optimistic
    const res = await applyAffirmationSettings(next);
    setAff(res.settings);
    if (res.permissionDenied) {
      Alert.alert(
        'Notifications are off',
        'Enable notifications for Kind in your device settings to receive daily affirmations.',
      );
    }
  };

  const toggleAff = () => applySettings({ ...aff, enabled: !aff.enabled });
  const changeHour = (d) => applySettings({ ...aff, hour: (aff.hour + d + 24) % 24 });
  const changeMinute = (d) => applySettings({ ...aff, minute: (aff.minute + d + 60) % 60 });

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('access_token');
          dispatch(setSignedIn(false));
        },
      },
    ]);
  };

  return (
    // Pastel gradient backdrop + transparent scroll, matching Home & Journal.
    <View style={{ flex: 1 }}>
      <ScreenGradientBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          {/* Glossy gradient avatar with a soft top-left sheen — a one-off,
              same "hero" gradient + sheen recipe SoftHeroCard uses internally,
              just built by hand here since it needs to render initials text
              inside a circle rather than a card. */}
          <View style={styles.avatarShadow}>
            <LinearGradient
              colors={[pastel.heroPink, pastel.heroPurple, pastel.heroBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <View style={styles.avatarSheen} pointerEvents="none" />
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.profileName}>{userName}'s Space</Text>
          <Text style={styles.profileSub}>Take care of yourself 💜</Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Days Active', value: '12' },
            { label: 'Entries', value: '8' },
            { label: 'Streak 🔥', value: '5' },
          ].map((stat, i) => (
            // CHANGED: added `fill` — SoftCard's default fill is translucent
            // white meant to let the page gradient bleed through it. These
            // tiles sit close together over a fairly pale patch of the page
            // gradient, so the translucency wasn't reading as "glass," just
            // flat pale gray. A baked-in lavender tint (same idea as the hero
            // cards' baked-in color) fixes it regardless of what's behind it.
            <SoftCard
              key={stat.label}
              seed={20 + i}
              sparkleCount={2}
              radius={18}
              fill={['rgba(199,168,242,0.55)', 'rgba(255,255,255,0.42)']}
              style={styles.statCard}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </SoftCard>
          ))}
        </View>

        <SoftCard seed={13} sparkleCount={3} fill={['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.42)']}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekStats}>
            {[
              { icon: 'emoticon-happy-outline', label: 'Moods logged', val: 5 },
              { icon: 'book-open-variant', label: 'Journal entries', val: 2 },
              { icon: 'weather-windy', label: 'Breathe sessions', val: 3 },
            ].map((s) => (
              <View key={s.label} style={styles.weekStatRow}>
                <SoftIcon size={32} radius={10} tint="lavender">
                  <MaterialCommunityIcons name={s.icon} size={16} color="#fff" />
                </SoftIcon>
                <Text style={styles.weekStatLabel}>{s.label}</Text>
                <Text style={styles.weekStatVal}>{s.val}</Text>
              </View>
            ))}
          </View>
        </SoftCard>

        <Text style={styles.sectionTitle}>Settings</Text>

        {/* Daily Affirmation */}
        <SoftCard seed={15} sparkleCount={3} fill={['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.42)']}>
          <View style={styles.affHeaderRow}>
            <SoftIcon size={36} radius={12} tint="purple">
              <MaterialCommunityIcons name="white-balance-sunny" size={18} color="#fff" />
            </SoftIcon>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Daily Affirmation</Text>
              <Text style={styles.settingDesc}>A kind note, once a day</Text>
            </View>
            <Switch
              value={aff.enabled}
              onValueChange={toggleAff}
              trackColor={{ true: pastel.purpleDeep, false: 'rgba(126,111,163,0.3)' }}
              thumbColor="#fff"
            />
          </View>

          {aff.enabled && (
            <View style={styles.affTimeBlock}>
              <Text style={styles.affTimeCaption}>Remind me at</Text>
              <Text style={styles.affTimeValue}>{formatTime(aff.hour, aff.minute)}</Text>

              <View style={styles.affStepperGroup}>
                <View style={styles.affStepperCol}>
                  <Text style={styles.affStepperLabel}>Hour</Text>
                  <View style={styles.affStepperBtns}>
                    <TouchableOpacity style={styles.affStepBtn} onPress={() => changeHour(-1)}>
                      <MaterialIcons name="remove" size={18} color={pastel.purpleDeep} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.affStepBtn} onPress={() => changeHour(1)}>
                      <MaterialIcons name="add" size={18} color={pastel.purpleDeep} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.affStepperCol}>
                  <Text style={styles.affStepperLabel}>Minute</Text>
                  <View style={styles.affStepperBtns}>
                    <TouchableOpacity style={styles.affStepBtn} onPress={() => changeMinute(-5)}>
                      <MaterialIcons name="remove" size={18} color={pastel.purpleDeep} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.affStepBtn} onPress={() => changeMinute(5)}>
                      <MaterialIcons name="add" size={18} color={pastel.purpleDeep} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </SoftCard>

        <SoftCard seed={19} sparkleCount={3} fill={['rgba(199,168,242,0.42)', 'rgba(255,255,255,0.42)']}>
          {SETTINGS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingRow, i < SETTINGS.length - 1 && styles.settingDivider]}
              activeOpacity={0.7}
            >
              <SoftIcon size={36} radius={12} tint={item.tint}>
                <MaterialIcons name={item.icon} size={18} color="#fff" />
              </SoftIcon>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingDesc}>{item.desc}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color={pastel.textMuted} />
            </TouchableOpacity>
          ))}
        </SoftCard>

        {/* Sign-out stays a soft rose glass button — same recipe as Journal's
            "Delete entry" affordance, so destructive actions read the same
            across tabs instead of each screen inventing its own red. */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={18} color={pastel.rose} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Kind v1.0.0 · Made with 💜</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginBottom: theme.spacing.lg, marginTop: theme.spacing.sm },
  avatarShadow: {
    borderRadius: 40, marginBottom: theme.spacing.sm,
    shadowColor: pastel.purpleDeep, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarSheen: {
    position: 'absolute', top: -6, left: -6, width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: theme.typography.fontSize.heading.sm, fontWeight: '800', color: pastel.textDeep },
  profileSub: { fontSize: theme.typography.fontSize.paragraph.sm, color: pastel.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  statCard: { flex: 1, marginBottom: 0 },
  statValue: { fontSize: 22, fontWeight: '800', color: pastel.purpleDeep },
  statLabel: { fontSize: 10, fontWeight: '600', color: pastel.textMuted, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: theme.typography.fontSize.paragraph.md, fontWeight: '700', color: pastel.textDeep, marginBottom: theme.spacing.sm },
  weekStats: { gap: 8 },
  weekStatRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 4 },
  weekStatLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: pastel.textDeep },
  weekStatVal: { fontSize: 16, fontWeight: '800', color: pastel.purpleDeep },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  settingDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.45)' },
  settingLabel: { fontSize: 14, fontWeight: '700', color: pastel.textDeep },
  settingDesc: { fontSize: 11, color: pastel.textMuted },
  affHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  affTimeBlock: {
    marginTop: theme.spacing.md, paddingTop: theme.spacing.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.45)', alignItems: 'center',
  },
  affTimeCaption: { fontSize: 11, color: pastel.textMuted, marginBottom: 2 },
  affTimeValue: { fontSize: 28, fontWeight: '800', color: pastel.purpleDeep, marginBottom: theme.spacing.md },
  affStepperGroup: { flexDirection: 'row', gap: theme.spacing.xl },
  affStepperCol: { alignItems: 'center', gap: 6 },
  affStepperLabel: { fontSize: 11, fontWeight: '600', color: pastel.textMuted },
  affStepperBtns: { flexDirection: 'row', gap: theme.spacing.sm },
  affStepBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: pastel.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: pastel.roseSoft, borderRadius: 16, padding: theme.spacing.md,
    marginBottom: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255,111,145,0.3)',
  },
  signOutText: { fontSize: 14, fontWeight: '700', color: pastel.rose },
  version: { textAlign: 'center', fontSize: 11, color: pastel.textMuted, marginBottom: theme.spacing.sm },
});

export default Profile;