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
                        
                        val amount = parseAmountFromSms(body)
                        if (amount != null) {
                            Log.i("SmsReceiver", "Parsed amount natively: $amount. Launching FloatingBubbleService directly...")
                            val serviceIntent = Intent(context, FloatingBubbleService::class.java).apply {
                                putExtra("amount", amount.toString())
                                putExtra("merchant", "Unknown")
                            }
                            context.startService(serviceIntent)
                        } else {
                            Log.i("SmsReceiver", "SMS was not a debit alert or amount could not be parsed.")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("SmsReceiver", "Error parsing SMS: ${e.message}")
            }
        }
    }

    private fun parseAmountFromSms(body: String): Double? {
        val text = body.lowercase()
        // Validate if it is a debit alert
        val isDebit = text.contains("debited") || text.contains("sent") || text.contains("paid") || text.contains("spent") || text.contains("txntype:dr")
        if (!isDebit) return null

        // Regex for extracting amount (matches Rs. X, INR X, etc.)
        val pattern = java.util.regex.Pattern.compile("(?:rs\\.?\\s*|inr\\s*|debited\\s+by\\s+|sent\\s+rs\\.\\s*)(\\d+(?:\\.\\d+)?)")
        val matcher = pattern.matcher(text)
        if (matcher.find()) {
            val amountStr = matcher.group(1)
            try {
                return amountStr?.toDouble()
            } catch (e: Exception) {
                return null
            }
        }
        return null
    }
}
