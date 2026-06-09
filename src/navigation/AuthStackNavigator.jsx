import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NavigationScreens from '../config/NavigationScreens';
import Login from '../screens/Login';
import Signup from '../screens/Signup';

const AuthStack = createNativeStackNavigator();

const AuthStackNavigator = () => {
  return (
    <AuthStack.Navigator
      initialRouteName={NavigationScreens.Login}
      screenOptions={{ headerShown: false }}
    >
      <AuthStack.Screen name={NavigationScreens.Login} component={Login} />
      <AuthStack.Screen name={NavigationScreens.Signup} component={Signup} />
    </AuthStack.Navigator>
  );
};

export default AuthStackNavigator;
