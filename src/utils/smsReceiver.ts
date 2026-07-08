import { NativeModules, DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { fetchExpenses, fetchSummary, fetchBreakdown } from '../redux/expenseSlice';
import { store } from '../redux/store';

const { SmsModule } = NativeModules;

// Request Android SMS permissions
export async function requestSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const grantedReceive = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      {
        title: 'SMS Receiver Permission',
        message: 'This app needs access to receive SMS to automatically detect and log payment notifications.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    const grantedRead = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Read Permission',
        message: 'This app needs access to read SMS to parse transaction amounts and merchants.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return (
      grantedReceive === PermissionsAndroid.RESULTS.GRANTED &&
      grantedRead === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.warn('Error requesting SMS permissions:', err);
    return false;
  }
}

// Regex matching systems for transactions
export interface ParsedSms {
  amount: number;
  merchant: string;
  category: string;
  description: string;
}

export function parseTransactionSms(body: string): ParsedSms | null {
  const text = body.toLowerCase();

  // 1. Validate if it's a transaction/payment notification
  const isDebit = text.includes('debited') || text.includes('sent') || text.includes('paid') || text.includes('spent') || text.includes('txntype:dr');
  if (!isDebit) return null;

  // 2. Extract Amount
  const amountRegex = /(?:rs\.?\s*|inr\s*|debited\s+by\s+|sent\s+rs\.\s*)(\d+(?:\.\d+)?)/;
  const amountMatch = text.match(amountRegex);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  return {
    amount,
    merchant: 'Unknown',
    category: 'Other',
    description: `SMS Auto Logged: Rs. ${amount}`,
  };
}

// Setup the Native Receiver Listener
export function setupSmsListener() {
  if (Platform.OS !== 'android') return;

  // Force instantiation and request overlay permissions on launch
  if (SmsModule) {
    if (typeof SmsModule.initModule === 'function') {
      SmsModule.initModule();
    }
    // Check and request overlay drawing permission
    if (typeof SmsModule.requestOverlayPermission === 'function') {
      SmsModule.requestOverlayPermission();
    }
  }

  console.log('Subscribing to native SMS events via DeviceEventEmitter...');

  // Listen for native expense creation notifications to automatically refresh dashboard stats
  const subscription = DeviceEventEmitter.addListener('onExpenseCreated', () => {
    console.log('[smsReceiver] JS received background expense created notification. Refreshing dashboard...');
    const month = new Date().toISOString().substring(0, 7);
    store.dispatch(fetchExpenses());
    store.dispatch(fetchSummary(month));
    store.dispatch(fetchBreakdown(month));
  });

  return () => {
    subscription.remove();
  };
}
