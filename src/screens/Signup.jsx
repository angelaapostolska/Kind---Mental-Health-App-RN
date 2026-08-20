import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRegisterMutation } from '@/api/authApi';
// CHANGED: same swap as Login — pastel-glass system instead of the flat
// theme.colors.surface.two + ThemeButton look.
import { ScreenTitle, ThemeInput, ThemePasswordInput, ScreenGradientBackground, GradientButton, pastel } from '@/components';
import { SoftCard, SoftIcon } from '@/components/home/SoftGlass';
import NavigationScreens from '@/config/NavigationScreens';
import { theme } from '@/constants/theme';
import { setSignedIn } from '@/store/commonSlices/userSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { showErrorToast } from '@/utils';

const PASSWORD_RULES = [
  { key: 'minLength', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'hasUppercase', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'hasLowercase', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { key: 'hasNumber', label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
];

const Signup = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  // Onboarding already collected these — carry them into the account instead
  // of asking again / letting them go to waste once the user signs up.
  const onboardingName = useAppSelector((state) => state.appState?.userName);
  const selectedAnimal = useAppSelector((state) => state.appState?.selectedAnimal);
  const [name, setName] = useState(onboardingName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  const ruleResults = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) }));
  const allRulesPassed = ruleResults.every((r) => r.passed);

  const handleEmailChange = (text) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (!passwordTouched && text.length > 0) setPasswordTouched(true);
  };

  const handleSignupPress = async () => {
    if (!name || !email || !password) {
      showErrorToast('Please fill in all fields');
      return;
    }
    if (!allRulesPassed) {
      setPasswordTouched(true);
      showErrorToast('Password does not meet the requirements');
      return;
    }
    try {
      await register({ name, email, password, animal: selectedAnimal }).unwrap();
      dispatch(setSignedIn(true));
    } catch (err) {
      if (err?.status === 409) {
        setEmailError('This email is already taken');
      } else {
        const errorMsg = err?.data?.error ?? 'Registration failed. Please try again.';
        showErrorToast(errorMsg);
      }
    }
  };

  return (
    <View style={styles.safeArea}>
      <ScreenGradientBackground />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <View style={styles.headerContent}>
              {/* CHANGED: added a SoftIcon logo badge, matching Login's — the
                  two auth screens now read as a matching pair. */}
              <SoftIcon size={88} radius={26} baseColor={pastel.heroPink} style={styles.logoIcon}>
                <MaterialCommunityIcons name="account-plus" size={38} color="#fff" />
                {/* white accent circle, top-left, diagonal fade to transparent —
                    same recipe as Login's icon / the active tab pill */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.3, y: 0.3 }}
                  style={styles.logoAccentTopLeft}
                  pointerEvents="none"
                />
                {/* mirrored accent circle, bottom-right */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']}
                  start={{ x: 1, y: 1 }}
                  end={{ x: 0.6, y: 0.6 }}
                  style={styles.logoAccentBottomRight}
                  pointerEvents="none"
                />
              </SoftIcon>
              <ScreenTitle title="Create Account" containerStyle={styles.title} />
              <Text style={styles.subtitle}>Start your wellness journey today</Text>
            </View>

            {/* Form — same frosted glass card every other screen uses */}
            <SoftCard seed={45} sparkleCount={3} style={styles.formCard}>
              <View style={styles.inputContainer}>
                <ThemeInput
                  placeholder="Full Name"
                  onChangeText={setName}
                  value={name}
                  autoCapitalize="words"
                />
                <ThemeInput
                  placeholder="Email"
                  onChangeText={handleEmailChange}
                  value={email}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  isValid={!emailError}
                  errorMessage={emailError}
                />
                <View>
                  <ThemePasswordInput
                    placeholder="Password"
                    onChangeText={handlePasswordChange}
                    value={password}
                    isValid={!passwordTouched || allRulesPassed}
                    isSuccess={passwordTouched && allRulesPassed}
                  />
                  {passwordTouched && (
                    <View style={styles.rulesContainer}>
                      <Text style={styles.rulesTitle}>Password must contain:</Text>
                      {ruleResults.map((r) => (
                        <View key={r.key} style={styles.ruleRow}>
                          <MaterialIcons
                            name={r.passed ? 'check-circle' : 'radio-button-unchecked'}
                            size={14}
                            // CHANGED: '#27ae60' → pastel.mintDeep, ties the
                            // success color back into the app's own palette
                            // instead of a generic green.
                            color={r.passed ? pastel.mintDeep : pastel.textMuted}
                          />
                          <Text style={[styles.ruleText, r.passed && styles.ruleTextPassed]}>
                            {r.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <GradientButton label="Sign Up" onPress={handleSignupPress} loading={isLoading} />

              <TouchableOpacity
                onPress={() => navigation.navigate(NavigationScreens.Login)}
                style={styles.loginContainer}
              >
                <Text style={styles.loginText}>
                  Already have an account? <Text style={styles.loginLink}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </SoftCard>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  // CHANGED: transparent instead of theme.colors.surface.two — ScreenGradientBackground shows through
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: theme.spacing.xxxl,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 0,
    paddingHorizontal: theme.spacing.md,
  },
  logoIcon: {
    marginBottom: theme.spacing.md,
  },
  // NEW: same two accent circles as Login's icon, scaled down to match this
  // icon's smaller size (88 vs Login's 100).
  logoAccentTopLeft: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 48,
    height: 48,
    borderRadius: 22,
  },
  logoAccentBottomRight: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 66,
    height: 66,
    borderRadius: 22,
  },
  title: {
    marginTop: theme.spacing.md,
  },
  // CHANGED: theme.colors.text.secondary → pastel.textMuted
  subtitle: {
    marginTop: theme.spacing.xs,
    color: pastel.textMuted,
    fontSize: theme.typography.fontSize.paragraph.md,
    textAlign: 'center',
  },
  formCard: {
    marginTop: theme.spacing.xxxl,
    marginHorizontal: theme.spacing.md,
  },
  inputContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  rulesContainer: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    gap: 4,
  },
  // CHANGED: theme.colors.text.secondary → pastel.textMuted
  rulesTitle: {
    fontSize: theme.typography.fontSize.label.xs,
    fontWeight: theme.typography.fontVariants.secondary.semibold,
    color: pastel.textMuted,
    marginBottom: 2,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // CHANGED: theme.colors.text.secondary → pastel.textMuted
  ruleText: {
    fontSize: theme.typography.fontSize.label.xs,
    color: pastel.textMuted,
  },
  // CHANGED: '#27ae60' → pastel.mintDeep
  ruleTextPassed: {
    color: pastel.mintDeep,
    fontWeight: theme.typography.fontVariants.secondary.semibold,
  },
  loginContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  // CHANGED: theme.colors.text.secondary → pastel.textMuted
  loginText: {
    color: pastel.textMuted,
    fontSize: theme.typography.fontSize.paragraph.md,
  },
  // CHANGED: theme.colors.text.action → pastel.purpleDeep
  loginLink: {
    color: pastel.purpleDeep,
    fontWeight: theme.typography.fontVariants.secondary.semibold,
  },
});

export default Signup;