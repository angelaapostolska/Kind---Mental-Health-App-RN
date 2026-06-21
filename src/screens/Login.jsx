import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useLoginMutation } from '@/api/authApi';
import { ScreenTitle, ThemeInput, ThemePasswordInput, ThemeButton } from '@/components';
import NavigationScreens from '@/config/NavigationScreens';
import { theme } from '@/constants/theme';
import { setSignedIn, setUserId, setUserEmail } from '@/store/commonSlices/userSlice';
import { useAppDispatch } from '@/store/store';
import { showErrorToast } from '@/utils';

const Login = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginPress = async () => {
    if (!email || !password) {
      showErrorToast('Please fill in all fields');
      return;
    }
    try {
      // login now returns the user id directly in the response
      const userData = await login({ email, password }).unwrap();

      dispatch(setUserId(userData.id));
      dispatch(setUserEmail(email));
      dispatch(setSignedIn(true));
    } catch (err) {
      let errorMsg = 'Login failed. Please check your credentials.';
      if (err?.data?.message) errorMsg = err.data.message;
      showErrorToast(errorMsg);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.logoContent}>
              <View style={styles.logoPlaceholder} />
              <ScreenTitle title="Welcome Back" containerStyle={styles.title} />
              <Text style={styles.subtitle}>Your mental wellness companion</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
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
                <TouchableOpacity activeOpacity={0.6} onPress={() => {}}>
                  <Text style={styles.forgotPass}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <ThemeButton title="Log In" onPress={handleLoginPress} loading={isLoading} />

              <TouchableOpacity
                onPress={() => navigation.navigate(NavigationScreens.Signup)}
                style={styles.signupContainer}
              >
                <Text style={styles.signupText}>
                  Don't have an account? <Text style={styles.signupLink}>Sign Up</Text>
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
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.xxxl,
  },
  logoContent: {
    alignItems: 'center',
    marginTop: theme.spacing.superlg,
    paddingHorizontal: theme.spacing.md,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface.brandPrimary,
    marginBottom: theme.spacing.lg,
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
  forgotPass: {
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontVariants.secondary.semibold,
    fontSize: theme.typography.fontSize.label.md,
    textDecorationLine: 'underline',
    alignSelf: 'flex-end',
  },
  signupContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  signupText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.paragraph.md,
  },
  signupLink: {
    color: theme.colors.text.action,
    fontWeight: theme.typography.fontVariants.secondary.semibold,
  },
});

export default Login;