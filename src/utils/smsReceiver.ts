import { NativeModules, NativeEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { createExpense } from '../redux/expenseSlice';
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
  // Match patterns like "Rs. 250", "Rs 250.00", "INR 300", "Rs.250", "debited by 150"
  const amountRegex = /(?:rs\.?\s*|inr\s*|debited\s+by\s+|sent\s+rs\.\s*)(\d+(?:\.\d+)?)/;
  const amountMatch = text.match(amountRegex);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  // 3. Extract Merchant
  // Match patterns like "at Starbucks", "to Paytm", "for Uber", "info: Starbucks", "vpa merchantname"
  let merchant = 'Unknown Merchant';
  const merchantPatterns = [
    /(?:at|to|for|paid\s+to|vpa)\s+([a-zA-Z0-9\s\.\*]+?)(?:\s+on|\s+ref|\s+date|\s+using|\s+balance|\s+vpa|$)/,
    /info:\s*([a-zA-Z0-9\s\.\*]+?)(?:\s+on|\s+ref|\s+date|$)/
  ];

  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      merchant = match[1].trim();
      break;
    }
  }

  // Sanitize merchant string
  merchant = merchant
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // 4. Categorize transaction based on merchant keyword mappings
  let category = 'Other';
  const mLower = merchant.toLowerCase();
  
  if (
    mLower.includes('starbucks') ||
    mLower.includes('swiggy') ||
    mLower.includes('zomato') ||
    mLower.includes('rest') ||
    mLower.includes('food') ||
    mLower.includes('cafe') ||
    mLower.includes('pizza') ||
    mLower.includes('canteen')
  ) {
    category = 'Food';
  } else if (
    mLower.includes('uber') ||
    mLower.includes('ola') ||
    mLower.includes('rapido') ||
    mLower.includes('metro') ||
    mLower.includes('rail') ||
    mLower.includes('irctc') ||
    mLower.includes('cab') ||
    mLower.includes('taxi')
  ) {
    category = 'Travel';
  } else if (
    mLower.includes('amazon') ||
    mLower.includes('flipkart') ||
    mLower.includes('myntra') ||
    mLower.includes('shopping') ||
    mLower.includes('store') ||
    mLower.includes('mart')
  ) {
    category = 'Shopping';
  } else if (
    mLower.includes('electricity') ||
    mLower.includes('bill') ||
    mLower.includes('water') ||
    mLower.includes('gas') ||
    mLower.includes('recharge') ||
    mLower.includes('telecom') ||
    mLower.includes('jio') ||
    mLower.includes('airtel')
  ) {
    category = 'Bills';
  }

  return {
    amount,
    merchant,
    category,
    description: `SMS: Paid Rs. ${amount} to ${merchant}`,
  };
}

// Setup the Native Receiver Listener
export function setupSmsListener() {
  if (Platform.OS !== 'android') return;

  // Force instantiation of the native SmsModule
  console.log('SmsModule.initModule type:', typeof SmsModule?.initModule);
  if (SmsModule && typeof SmsModule.initModule === 'function') {
    SmsModule.initModule();
  }

  const eventEmitter = new NativeEventEmitter(SmsModule);
  
  console.log('Subscribing to native SMS events...');
  
  const subscription = eventEmitter.addListener('onSmsReceived', (event) => {
    const { sender, body } = event;
    console.log(`JS received SMS from: ${sender}, Body: ${body}`);

    const parsed = parseTransactionSms(body);
    if (parsed) {
      console.log('Successfully parsed payment SMS:', parsed);
      
      // Auto-dispatch createExpense thunk to the Redux store
      store.dispatch(
        createExpense({
          amount: parsed.amount,
          category: parsed.category,
          description: parsed.description,
          date: new Date().toISOString().split('T')[0], // log on current date
        })
      );
    } else {
      console.log('Received SMS was not a standard debit/payment notification. Ignoring.');
    }
  });

  return () => {
    subscription.remove();
  };
}
