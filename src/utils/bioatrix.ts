import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

/** Check if fingerprint or faceID available */
export async function isBiometricAvailable() {
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    return available;
  } catch {
    return false;
  }
}

/** Prompt user for biometric auth */
export async function authenticateBiometric() {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Authenticate to open GP Expense Tracker',
    });
    return success === true;
  } catch {
    return false;
  }
}
