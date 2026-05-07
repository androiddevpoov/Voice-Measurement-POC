/**
 * Compass Tex — voice-driven TnA Measurements entry
 *
 * @format
 */

import React from 'react';
import {
  LogBox,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
} from 'react-native';

import PersonalInfoScreen from './src/screens/PersonalInfoScreen';

LogBox.ignoreLogs([
  'new NativeEventEmitter',
]);

const App: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#f8fafc"
      />
      <PersonalInfoScreen />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});

export default App;
