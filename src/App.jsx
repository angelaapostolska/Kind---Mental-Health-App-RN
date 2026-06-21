import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { toastConfig } from '@/config/themedToast';
import Navigation from '@/navigation';
import store, { persistor } from '@/store/store';

const App = () => {
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
