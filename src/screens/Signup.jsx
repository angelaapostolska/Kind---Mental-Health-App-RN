import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRegisterMutation } from '@/api/authApi';
import { ScreenTitle, ThemeInput, ThemePasswordInput, ThemeButton } from '@/components';
import NavigationScreens from '@/config/NavigationScreens';
import { theme } from '@/constants/theme';
import { setSignedIn } from '@/store/commonSlices/userSlice';
import { useAppDispatch } from '@/store/store';
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
  const [name, setName] = useState('');
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
      await register({ name, email, password }).unwrap();
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.headerContent}>
              <ScreenTitle title="Create Account" containerStyle={styles.title} />
              <Text style={styles.subtitle}>Start your wellness journey today</Text>
            </View>

            <View style={styles.formContainer}>
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
                            color={r.passed ? '#27ae60' : theme.colors.text.secondary}
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

              <ThemeButton title="Sign Up" onPress={handleSignupPress} loading={isLoading} />

              <TouchableOpacity
                onPress={() => navigation.navigate(NavigationScreens.Login)}
                style={styles.loginContainer}
              >
                <Text style={styles.loginText}>
                  Already have an account? <Text style={styles.loginLink}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface.two,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingTop: theme.spacing.xxxl,
    paddingBottom: theme.spacing.xxxl,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  title: {
    marginTop: theme.spacing.md,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.paragraph.md,
    textAlign: 'center',
  },
  formContainer: {
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
  rulesTitle: {
    fontSize: theme.typography.fontSize.label.xs,
    fontWeight: theme.typography.fontVariants.secondary.semibold,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: theme.typography.fontSize.label.xs,
    color: theme.colors.text.secondary,
  },
  ruleTextPassed: {
    color: '#27ae60',
    fontWeight: theme.typography.fontVariants.secondary.semibold,
  },
  loginContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  loginText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.paragraph.md,
  },
  loginLink: {
    color: theme.colors.text.action,
    fontWeight: theme.typography.fontVariants.secondary.semibold,
  },
});

export default Signup;
