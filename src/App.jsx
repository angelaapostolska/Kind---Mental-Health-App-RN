import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { registerRootComponent } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { toastConfig } from '@/config/themedToast';
import Navigation from '@/navigation';
import store, { persistor } from '@/store/store';
import { syncScheduledAffirmations } from '@/utils/notifications';   // CHANGED

// CHANGED: Expo Go (SDK 53+) logs a red error because remote push was removed from it.
// Our daily affirmations are LOCAL notifications and still work — this just hides the noise.
// (Has no effect in a real dev/production build, where the warning isn't emitted anyway.)
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
]);

const App = () => {
  // CHANGED: top up & reshuffle the daily-affirmation schedule each launch
  useEffect(() => {
    syncScheduledAffirmations();
  }, []);

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <Provider store={store}>
        <PersistGate loading={<View style={{ flex: 1 }}><ActivityIndicator /></View>} persistor={persistor}>
          <Navigation />
          <Toast config={toastConfig} />
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
};

registerRootComponent(App);

export default App;