// src/navigation/MainStackNavigator.jsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NavigationScreens from '../config/NavigationScreens';
import AppTabs from './TabBar';

const MainStack = createNativeStackNavigator();

const MainStackNavigator = () => {
  return (
    <MainStack.Navigator
      initialRouteName={NavigationScreens.TabBar}
      screenOptions={{ headerShown: false }}
    >
      <MainStack.Screen name={NavigationScreens.TabBar} component={AppTabs} />
    </MainStack.Navigator>
  );
};

export default MainStackNavigator;
