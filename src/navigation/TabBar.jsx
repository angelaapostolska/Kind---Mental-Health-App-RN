// src/navigation/TabBar.jsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';   // CHANGED: gradient tab-bar background
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarScreens } from '../config/NavigationScreens';
import Home from '../tabs/Home';
import Mood from '../tabs/Mood';
import Journal from '../tabs/Journal';
import Resources from '../tabs/Resources';
import Profile from '../tabs/Profile';
import { pastel } from '@/components';   // CHANGED: pastel glass nav bar
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const Tab = createBottomTabNavigator();

// CHANGED: the tab bar's actual gradient fill. `tabBarStyle.backgroundColor` only
// ever accepts a flat color — React Navigation's dedicated hook for a custom
// background (gradient, blur, image, etc.) is the `tabBarBackground` option below,
// which renders this absolutely-positioned behind the bar content.
const TabBarBackground = () => (
  <LinearGradient
    colors={[pastel.navPink, pastel.navPurple, pastel.navBlue]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0.3 }}
    style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
  >
    {/* a touch of shine, consistent with the rest of the app's glass cards */}
    <LinearGradient
      colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 0.45, y: 1 }}
      style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
    />
  </LinearGradient>
);

// CHANGED: rounder, friendlier icon per tab, filled when active / outline when idle
// (the old icons — a plain house, a notebook rectangle — read as flat & generic).
const ICONS = {
  Home: { outline: 'home-variant-outline', filled: 'home-variant' },
  Mood: { outline: 'emoticon-happy-outline', filled: 'emoticon-happy' },
  Journal: { outline: 'book-open-page-variant-outline', filled: 'book-open-page-variant' },
  Resources: { outline: 'weather-windy', filled: 'meditation' },
  Profile: { outline: 'account-circle-outline', filled: 'account-circle' },
};

// CHANGED: the active pill now spans icon + label together (via
// tabBarActiveBackgroundColor / tabBarItemStyle below), matching the reference's
// highlighted "Home" tab — so this just renders the icon itself.
const TabIcon = ({ tab, focused, color }) => {
  const name = focused ? ICONS[tab].filled : ICONS[tab].outline;
  return <MaterialCommunityIcons name={name} size={22} color={color} />;
};

const AppTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: pastel.purpleDeep,      // CHANGED
        tabBarInactiveTintColor: pastel.textMuted,      // CHANGED
        // CHANGED: floating glass pill instead of a flush, edge-to-edge white bar.
        // Wider side margins than the first pass (16 → 30) — there wasn't enough
        // breathing room between the bar and the screen edge. backgroundColor is
        // now transparent — the actual fill comes from tabBarBackground below.
        // Every tab screen already has paddingBottom:100 in its content, which
        // comfortably clears this bar's height + bottom margin.
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: 15,
          // Floating capsule
          left: 40,
          right: 40,

          bottom: Math.max(insets.bottom, 12) + 8,

          height: 70,

          borderRadius: 999,

          backgroundColor: 'transparent',

          borderTopWidth: 0,

          shadowColor: pastel.purpleDeep,
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: {
            width: 0,
            height: 6,
          },

          elevation: 10,
        },

        tabBarBackground: TabBarBackground,   // CHANGED: the actual gradient fill
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        // CHANGED: tabBarActiveBackgroundColor + tabBarItemStyle gives the active
        // tab a single rounded pill spanning BOTH the icon and the label together
        // (matching the reference's highlighted "Home" tab), instead of a small
        // circle hugging just the icon.
        tabBarActiveBackgroundColor: 'rgba(183,156,242,0.28)',
        tabBarItemStyle: {
          marginHorizontal: 4,
          marginVertical: 6,
          borderRadius: 18,
        },
      }}
    >
      <Tab.Screen
        name={TabBarScreens.Home}
        component={Home}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => <TabIcon tab="Home" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name={TabBarScreens.Mood}
        component={Mood}
        options={{
          tabBarLabel: 'Mood',
          tabBarIcon: ({ focused, color }) => <TabIcon tab="Mood" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name={TabBarScreens.Journal}
        component={Journal}
        options={{
          tabBarLabel: 'Journal',
          tabBarIcon: ({ focused, color }) => <TabIcon tab="Journal" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name={TabBarScreens.Resources}
        component={Resources}
        options={{
          tabBarLabel: 'Breathe',
          tabBarIcon: ({ focused, color }) => <TabIcon tab="Resources" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name={TabBarScreens.Profile}
        component={Profile}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color }) => <TabIcon tab="Profile" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AppTabs;