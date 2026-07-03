// src/navigation/TabBar.jsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarScreens } from '../config/NavigationScreens';
import Home from '../tabs/Home';
import Mood from '../tabs/Mood';
import Journal from '../tabs/Journal';
import Resources from '../tabs/Resources';
import Profile from '../tabs/Profile';
import { pastel } from '@/components';

const Tab = createBottomTabNavigator();

// CHANGED: rounder, friendlier icon per tab, filled when active / outline when idle.
const ICONS = {
  Home: { outline: 'home-variant-outline', filled: 'home-variant' },
  Mood: { outline: 'emoticon-happy-outline', filled: 'emoticon-happy' },
  Journal: { outline: 'book-open-page-variant-outline', filled: 'book-open-page-variant' },
  Resources: { outline: 'weather-windy', filled: 'meditation' },
  Profile: { outline: 'account-circle-outline', filled: 'account-circle' },
};

// CHANGED: 'Breathe' is the visible label for the Resources route.
const LABELS = { Home: 'Home', Mood: 'Mood', Journal: 'Journal', Resources: 'Breathe', Profile: 'Profile' };

// CHANGED: glossy pill that sits behind the ACTIVE tab — same recipe as the glass
// cards / clay icons (tinted fill → top-left reflection sheen → white edge), instead
// of React Navigation's flat `tabBarActiveBackgroundColor` rectangle. Rendered as an
// absolute fill so the icon+label (with their own padding) define the pill's size.
const ActivePill = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <LinearGradient
      colors={['rgba(255,255,255,0.92)', 'rgba(199,168,242,0.55)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFillObject, styles.pill]}
    />
    {/* reflection — bright top-left, fading out */}
    <LinearGradient
      colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.6, y: 0.9 }}
      style={[StyleSheet.absoluteFillObject, styles.pill]}
    />
    {/* glossy white border */}
    <View style={[StyleSheet.absoluteFillObject, styles.pillBorder]} />
  </View>
);

// CHANGED: fully custom bar so BOTH the bar and the active indicator get the glass
// treatment (gloss + reflection + border). The old built-in options couldn't border
// or add a sheen to either one.
const GlassTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.barWrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}
    >
      <View style={styles.bar}>
        {/* glass bar fill — same recipe as the cards */}
        <LinearGradient
          colors={[pastel.navPink, pastel.navPurple, pastel.navBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.4 }}
          style={[StyleSheet.absoluteFillObject, styles.barFill]}
          pointerEvents="none"
        >
          {/* reflection sheen */}
          <LinearGradient
            colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
            start={{ x: 0.08, y: 0 }}
            end={{ x: 0.55, y: 0.9 }}
            style={[StyleSheet.absoluteFillObject, styles.barFill]}
          />
          {/* glossy white border */}
          <View style={[StyleSheet.absoluteFillObject, styles.barBorder]} />
        </LinearGradient>

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const tab = route.name;
            const color = focused ? pastel.purpleDeep : pastel.textMuted;
            const iconName = focused ? ICONS[tab].filled : ICONS[tab].outline;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
              >
                {/* CHANGED: generous padding inside the item → clear distance between
                    the icon/label and the edge of the active pill. */}
                <View style={[styles.item, focused && styles.itemActive]}>
                  {focused && <ActivePill />}
                  <MaterialCommunityIcons name={iconName} size={22} color={color} />
                  <Text style={[styles.label, { color }]} numberOfLines={1}>{LABELS[tab]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const AppTabs = () => (
  <Tab.Navigator
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <GlassTabBar {...props} />}
  >
    <Tab.Screen name={TabBarScreens.Home} component={Home} />
    <Tab.Screen name={TabBarScreens.Mood} component={Mood} />
    <Tab.Screen name={TabBarScreens.Journal} component={Journal} />
    <Tab.Screen name={TabBarScreens.Resources} component={Resources} />
    <Tab.Screen name={TabBarScreens.Profile} component={Profile} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  // CHANGED: wider again. The old bar stacked marginHorizontal:15 with left:40/right:40,
  // squeezing it narrow. Now a single, modest side margin restores the width.
  barWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  bar: {
    height: 68,
    borderRadius: 999,
    // floating glow
    shadowColor: pastel.purpleDeep,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  barFill: { borderRadius: 999, overflow: 'hidden' },
  barBorder: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: pastel.glassBorder,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // CHANGED: the pill now wraps icon + label with real breathing room (10v / 14h)
  // so there's space between the content and the indicator's edge.
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  itemActive: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  pill: { borderRadius: 999, overflow: 'hidden' },
  pillBorder: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  label: { fontSize: 11, fontWeight: '700' },
});

export default AppTabs;