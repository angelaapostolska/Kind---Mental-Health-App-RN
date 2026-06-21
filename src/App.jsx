import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { registerRootComponent } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { toastConfig } from '@/config/themedToast';
import Navigation from '@/navigation';
import store, { persistor } from '@/store/store';

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={<View style={{ flex: 1 }}><ActivityIndicator /></View>} persistor={persistor}>
            <Navigation />
            <Toast config={toastConfig} />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

registerRootComponent(App);

export default App;