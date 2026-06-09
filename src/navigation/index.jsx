// src/navigation/index.jsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AuthStackNavigator from './AuthStackNavigator';
import MainStackNavigator from './MainStackNavigator';
import OnboardingNavigator from './OnboardingNavigator';

const Navigation = () => {
  const isSignedIn = useSelector((state) => state.userState.isSignedIn);
  const hideOnboarding = useSelector((state) => state.appState?.hideOnboarding);

  return (
    <NavigationContainer>
      {!hideOnboarding
        ? <OnboardingNavigator />
        : isSignedIn
          ? <MainStackNavigator />
          : <AuthStackNavigator />
      }
    </NavigationContainer>
  );
};

export default Navigation;
