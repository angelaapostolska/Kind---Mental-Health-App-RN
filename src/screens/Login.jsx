import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Keyboard, TouchableWithoutFeedback, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLoginMutation } from '@/api/authApi';
// CHANGED: was theme.colors.surface.two + ThemeButton + a flat logo circle —
// now the same pastel-glass system every other screen uses: a gradient
// background, a SoftCard-wrapped form, a SoftIcon logo badge, and GradientButton.
import { ScreenTitle, ThemeInput, ThemePasswordInput, ScreenGradientBackground, GradientButton, pastel } from '@/components';
import { SoftCard, SoftIcon } from '@/components/home/SoftGlass';
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
      const userData = await login({ email, password }).unwrap();
      dispatch(setUserId(userData.id));
      dispatch(setUserEmail(email));
      dispatch(setSignedIn(true));
    } catch (err) {
      let errorMsg = 'Login failed. Please check your credentials.';
      if (err?.data?.error) errorMsg = err.data.error;
      showErrorToast(errorMsg);
    }
  };

  return (
    <View style={styles.safeArea}>
      <ScreenGradientBackground />
      {/* KeyboardAvoidingView pushes the content up on iOS; on Android
          android:windowSoftInputMode="adjustResize" handles it natively. */}
      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces
          >
            <View style={styles.container}>
              {/* Logo / title area */}
              <View style={styles.logoContent}>
                <SoftIcon size={100} radius={30} baseColor={pastel.heroPurple} style={styles.logoIcon}>
                  <MaterialCommunityIcons name="spa" size={44} color="#fff" />
                  {/* white accent circle, top-left, diagonal fade to transparent —
                      same recipe as the active tab pill */}
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
                <ScreenTitle title="Welcome Back" containerStyle={styles.title} />
                <Text style={styles.subtitle}>Your mental wellness companion</Text>
              </View>

              {/* Form — same frosted glass card every other screen uses */}
              <SoftCard seed={41} sparkleCount={3} style={styles.formCard}>
                <View style={styles.inputContainer}>
                  <ThemeInput
                    placeholder="Email"
                    onChangeText={setEmail}
                    value={email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                  <ThemePasswordInput
                    placeholder="Password"
                    onChangeText={setPassword}
                    value={password}
                    returnKeyType="done"
                    onSubmitEditing={handleLoginPress}
                  />
                  <TouchableOpacity activeOpacity={0.6} onPress={() => {}}>
                    <Text style={styles.forgotPass}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <GradientButton label="Log In" onPress={handleLoginPress} loading={isLoading} />

                <TouchableOpacity
                  onPress={() => navigation.navigate(NavigationScreens.Signup)}
                  style={styles.signupContainer}
                >
                  <Text style={styles.signupText}>
                    Don't have an account? <Text style={styles.signupLink}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </SoftCard>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  // CHANGED: transparent instead of theme.colors.surface.two — ScreenGradientBackground shows through
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  flexFill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: theme.spacing.xxxl,
  },
  logoContent: {
    alignItems: 'center',
    marginTop: 0,
    paddingHorizontal: theme.spacing.md,
  },
  // CHANGED: was a flat placeholder circle — now spacing for the SoftIcon logo badge
  logoIcon: {
    marginBottom: theme.spacing.lg,
  },
  // NEW: the two accent circles, same recipe as the active tab pill —
  // positioned inside SoftIcon's clipped gradient so they overlay the icon
  // without affecting its centered layout.
  logoAccentTopLeft: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 55,
    height: 55,
    borderRadius: 25,
  },
  logoAccentBottomRight: {
    position: 'absolute',
    bottom: 2.5,
    right: 2.5,
    width: 75,
    height: 75,
    borderRadius: 25,
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
  // CHANGED: was a plain margin block — now SoftCard's own style prop,
  // so it inherits the frosted fill/shadow/sheen/ring from SoftCard itself
  formCard: {
    marginTop: theme.spacing.xxxl,
    marginHorizontal: theme.spacing.md,
  },
  inputContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  // CHANGED: theme.colors.text.secondary → pastel.textMuted
  forgotPass: {
    color: pastel.textMuted,
    fontWeight: theme.typography.fontVariants.secondary.semibold,
    fontSize: theme.typography.fontSize.label.md,
    textDecorationLine: 'underline',
    alignSelf: 'flex-end',
  },
  signupContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  // CHANGED: theme.colors.text.secondary → pastel.textMuted
  signupText: {
    color: pastel.textMuted,
    fontSize: theme.typography.fontSize.paragraph.md,
  },
  // CHANGED: theme.colors.text.action → pastel.purpleDeep
  signupLink: {
    color: pastel.purpleDeep,
    fontWeight: theme.typography.fontVariants.secondary.semibold,
  },
});

export default Login;