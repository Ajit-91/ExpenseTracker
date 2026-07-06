import { NativeModules, DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { createExpense, aiCategorizeExpense } from '../redux/expenseSlice';
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

  // 1. Listen for SMS received events
  const subscription = DeviceEventEmitter.addListener('onSmsReceived', (event) => {
    const { sender, body } = event;
    console.log(`JS received SMS from: ${sender}, Body: ${body}`);

    const parsed = parseTransactionSms(body);
    if (parsed) {
      console.log('Successfully parsed payment SMS:', parsed);

      // Auto-dispatch createExpense and unwrap to get the resolved database expense _id
      store.dispatch(
        createExpense({
          amount: parsed.amount,
          category: parsed.category,
          description: parsed.description,
          date: new Date().toISOString().split('T')[0],
        })
      )
        .unwrap()
        .then((expense: any) => {
          if (expense && expense._id && typeof SmsModule.showBubble === 'function') {
            console.log(`Auto-logged expense ID ${expense._id}. Spawning native overlay bubble...`);
            SmsModule.showBubble(
              expense._id,
              parsed.amount.toString(),
              ""
            );
          }
        })
        .catch((err) => {
          console.error('Failed to create expense or show bubble:', err);
        });
    } else {
      console.log('Received SMS was not a standard debit/payment notification. Ignoring.');
    }
  });

  // 2. Listen for resolved SMS notes from the floating bubble overlay
  const noteSubscription = DeviceEventEmitter.addListener('onSmsNoteResolved', (event) => {
    const { expenseId, note } = event;
    console.log(`JS received SMS note resolved: ID=${expenseId}, Note=${note}`);

    // Dispatch AI categorization thunk to update database and dashboard metrics
    store.dispatch(aiCategorizeExpense({ id: expenseId, note }));
  });

  return () => {
    subscription.remove();
    noteSubscription.remove();
  };
}
