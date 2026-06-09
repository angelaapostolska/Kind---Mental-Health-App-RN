// src/navigation/TabBar.jsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TabBarScreens } from '../config/NavigationScreens';
import Home from '../tabs/Home';
import Mood from '../tabs/Mood';
import Journal from '../tabs/Journal';
import Resources from '../tabs/Resources';
import Profile from '../tabs/Profile';
import { theme } from '@/constants/theme';

const Tab = createBottomTabNavigator();

const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: theme.colors.surface.one,
          borderTopColor: theme.colors.border.one,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name={TabBarScreens.Home}
        component={Home}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name={TabBarScreens.Mood}
        component={Mood}
        options={{
          tabBarLabel: 'Mood',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="emoticon-happy-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name={TabBarScreens.Journal}
        component={Journal}
        options={{
          tabBarLabel: 'Journal',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="notebook-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name={TabBarScreens.Resources}
        component={Resources}
        options={{
          tabBarLabel: 'Breathe',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="weather-windy" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name={TabBarScreens.Profile}
        component={Profile}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AppTabs;
