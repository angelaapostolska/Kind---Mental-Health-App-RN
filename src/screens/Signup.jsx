import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useRegisterMutation } from '@/api/authApi';
import { ScreenTitle, ThemeInput, ThemePasswordInput, ThemeButton } from '@/components';
import NavigationScreens from '@/config/NavigationScreens';
import { theme } from '@/constants/theme';
import { setSignedIn } from '@/store/commonSlices/userSlice';
import { useAppDispatch } from '@/store/store';
import { showErrorToast } from '@/utils';

const Signup = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignupPress = async () => {
    if (!name || !email || !password) {
      showErrorToast('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      showErrorToast('Password must be at least 8 characters');
      return;
    }
    try {
      await register({ name, email, password }).unwrap();
      dispatch(setSignedIn(true));
    } catch (err) {
      let errorMsg = 'Registration failed. Please try again.';
      if (err?.data?.message) errorMsg = err.data.message;
      showErrorToast(errorMsg);
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
                  onChangeText={setEmail}
                  value={email}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <ThemePasswordInput
                  placeholder="Password"
                  onChangeText={setPassword}
                  value={password}
                />
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
