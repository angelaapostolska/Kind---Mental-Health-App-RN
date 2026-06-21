import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { setSignedIn } from '@/store/commonSlices/userSlice';

const SETTINGS = [
  { icon: 'notifications', label: 'Notifications', desc: 'Reminders & alerts' },
  { icon: 'brightness-6', label: 'Appearance', desc: 'Theme & display' },
  { icon: 'volume-up', label: 'Sound & Haptics', desc: 'Audio preferences' },
  { icon: 'security', label: 'Privacy', desc: 'Data & security' },
];

const Profile = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const appState = useAppSelector((s) => s.appState);
  const userName = appState?.userName || 'Friend';
  const initials = userName.slice(0, 2).toUpperCase();

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
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{userName}'s Space</Text>
        <Text style={styles.profileSub}>Take care of yourself 💜</Text>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Days Active', value: '12' },
          { label: 'Entries', value: '8' },
          { label: 'Streak 🔥', value: '5' },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weekStats}>
          {[
            { icon: 'emoticon-happy-outline', label: 'Moods logged', val: 5 },
            { icon: 'book-open-variant', label: 'Journal entries', val: 2 },
            { icon: 'weather-windy', label: 'Breathe sessions', val: 3 },
          ].map((s) => (
            <View key={s.label} style={styles.weekStatRow}>
              <View style={styles.weekStatIcon}>
                <MaterialCommunityIcons name={s.icon} size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.weekStatLabel}>{s.label}</Text>
              <Text style={styles.weekStatVal}>{s.val}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.card}>
        {SETTINGS.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.settingRow, i < SETTINGS.length - 1 && styles.settingDivider]}
          >
            <View style={styles.settingIcon}>
              <MaterialIcons name={item.icon} size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{item.label}</Text>
              <Text style={styles.settingDesc}>{item.desc}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <MaterialIcons name="logout" size={18} color={theme.colors.text.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Kind v1.0.0 · Made with 💜</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.surface.two },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginBottom: theme.spacing.lg, marginTop: theme.spacing.sm },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: theme.colors.primary },
  profileName: { fontSize: theme.typography.fontSize.heading.sm, fontWeight: '800', color: theme.colors.text.primary },
  profileSub: { fontSize: theme.typography.fontSize.paragraph.sm, color: theme.colors.text.secondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface.one,
    borderRadius: 16,
    padding: theme.spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: theme.colors.primary },
  statLabel: { fontSize: 10, fontWeight: '600', color: theme.colors.text.secondary, marginTop: 2, textAlign: 'center' },
  card: {
    backgroundColor: theme.colors.surface.one,
    borderRadius: 20,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.paragraph.md,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  weekStats: { gap: 8 },
  weekStatRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 4 },
  weekStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.surface.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStatLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text.primary },
  weekStatVal: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  settingDivider: { borderBottomWidth: 1, borderBottomColor: theme.colors.border.one },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surface.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text.primary },
  settingDesc: { fontSize: 11, color: theme.colors.text.secondary },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface.error,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  signOutText: { fontSize: 14, fontWeight: '700', color: theme.colors.text.error },
  version: { textAlign: 'center', fontSize: 11, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm },
});

export default Profile;