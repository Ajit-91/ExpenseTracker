package com.expensetracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.i("SmsReceiver", "onReceive triggered with action: ${intent.action}")
        
        if (intent.action == "android.provider.Telephony.SMS_RECEIVED") {
            try {
                val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
                if (messages != null) {
                    for (sms in messages) {
                        val sender = sms.originatingAddress ?: "Unknown"
                        val body = sms.messageBody ?: ""
                        
                        Log.i("SmsReceiver", "SMS received from $sender: $body")
                        
                        // Notify SmsModule of the received SMS
                        SmsModule.sendSmsEvent(sender, body)
                    }
                }
            } catch (e: Exception) {
                Log.e("SmsReceiver", "Error parsing SMS: ${e.message}")
            }
        }
    }
}
