import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Ensures we have RECORD_AUDIO permission on Android. iOS handles this through
 * Info.plist + the OS prompt that fires on the first Voice.start() call.
 *
 * Returns true if granted (or not needed); false otherwise.
 */
export async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone access',
        message:
          'Compass Tex needs microphone access to recognize spoken measurements.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.warn('[CompassTex] Mic permission error', e);
    return false;
  }
}
