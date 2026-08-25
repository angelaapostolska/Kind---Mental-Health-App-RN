import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import NavigationScreens from '../config/NavigationScreens';
import Login from '../screens/Login';
import Signup from '../screens/Signup';
import { useAppDispatch } from '@/store/store';
import { setOnboardingJustCompleted } from '@/store/commonSlices/appSlice';

const AuthStack = createNativeStackNavigator();

const AuthStackNavigator = () => {
  const dispatch = useAppDispatch();
  const onboardingJustCompleted = useSelector((state) => state.appState?.onboardingJustCompleted);

  // Onboarding was just completed this session: land on account creation
  // instead of login. Captured once at mount since initialRouteName is only
  // read on first render; the flag is consumed immediately after so a
  // later app open (onboarding not triggered) falls back to Login.
  const initialRouteName = useRef(
    onboardingJustCompleted ? NavigationScreens.Signup : NavigationScreens.Login
  ).current;

  useEffect(() => {
    if (onboardingJustCompleted) {
      dispatch(setOnboardingJustCompleted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <AuthStack.Screen name={NavigationScreens.Login} component={Login} />
      <AuthStack.Screen name={NavigationScreens.Signup} component={Signup} />
    </AuthStack.Navigator>
  );
};

export default AuthStackNavigator;
