package com.expensetracker

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val smsReceiver = SmsReceiver()

    private val noteReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            android.util.Log.i("SmsModule", "noteReceiver triggered. Action: ${intent.action}")
            if (intent.action == "com.expensetracker.SMS_NOTE_RESOLVED") {
                val expenseId = intent.getStringExtra("expenseId") ?: ""
                val note = intent.getStringExtra("note") ?: ""
                android.util.Log.i("SmsModule", "Broadcasting note details to JS. ID: $expenseId, Note: $note")
                
                val params = Arguments.createMap().apply {
                    putString("expenseId", expenseId)
                    putString("note", note)
                }
                
                val reactContext = companionContext
                if (reactContext != null && reactContext.hasActiveReactInstance()) {
                    android.util.Log.i("SmsModule", "Emitting event 'onSmsNoteResolved' to React Native JS context")
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onSmsNoteResolved", params)
                } else {
                    android.util.Log.w("SmsModule", "React Context was null or did not have active instance. Event skipped.")
                }
            }
        }
    }

    init {
        companionContext = reactContext
        
        // Dynamically register the SMS receiver
        try {
            val filter = IntentFilter("android.provider.Telephony.SMS_RECEIVED")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                reactContext.registerReceiver(smsReceiver, filter)
            }
        } catch (e: Exception) {
            android.util.Log.e("SmsModule", "Failed to register dynamic SMS receiver: ${e.message}")
        }

        // Dynamically register the local Note broadcast receiver
        try {
            val noteFilter = IntentFilter("com.expensetracker.SMS_NOTE_RESOLVED")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(noteReceiver, noteFilter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                reactContext.registerReceiver(noteReceiver, noteFilter)
            }
        } catch (e: Exception) {
            android.util.Log.e("SmsModule", "Failed to register dynamic note receiver: ${e.message}")
        }
    }

    override fun getName(): String = "SmsModule"

    @ReactMethod
    fun initModule() {
        android.util.Log.i("SmsModule", "SMS Module initialized from JS context")
    }

    @ReactMethod
    fun saveConfig(token: String, apiUrl: String) {
        val sharedPref = reactApplicationContext.getSharedPreferences("ExpenseTrackerPrefs", Context.MODE_PRIVATE)
        sharedPref.edit().apply {
            putString("auth_token", token)
            putString("api_url", apiUrl)
            apply()
        }
        android.util.Log.i("SmsModule", "Config saved to SharedPreferences. URL: $apiUrl")
    }

    @ReactMethod
    fun clearConfig() {
        val sharedPref = reactApplicationContext.getSharedPreferences("ExpenseTrackerPrefs", Context.MODE_PRIVATE)
        sharedPref.edit().clear().apply()
        android.util.Log.i("SmsModule", "Config cleared from SharedPreferences")
    }

    @ReactMethod
    fun requestOverlayPermission() {
        val context = reactApplicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!android.provider.Settings.canDrawOverlays(context)) {
                val intent = Intent(
                    android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:${context.packageName}")
                )
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            }
        }
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        val context = reactApplicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(android.provider.Settings.canDrawOverlays(context))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun showBubble(expenseId: String, amount: String, merchant: String) {
        val context = reactApplicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !android.provider.Settings.canDrawOverlays(context)) {
            android.util.Log.w("SmsModule", "Overlay permission not granted. Cannot show bubble.")
            return
        }
        val intent = Intent(context, FloatingBubbleService::class.java).apply {
            putExtra("expenseId", expenseId)
            putExtra("amount", amount)
            putExtra("merchant", merchant)
        }
        context.startService(intent)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RCTDeviceEventEmitter lifecycle (Bridgeless Mode compatibility)
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RCTDeviceEventEmitter lifecycle (Bridgeless Mode compatibility)
    }

    companion object {
        private var companionContext: ReactApplicationContext? = null
        private var lastMessageHash: String? = null
        private var lastMessageTime: Long = 0

        fun sendSmsEvent(sender: String, body: String): Boolean {
            val context = companionContext ?: return false
            
            // Deduplicate incoming events within a 2-second window
            val msgHash = "$sender|$body"
            val currentTime = System.currentTimeMillis()
            if (msgHash == lastMessageHash && (currentTime - lastMessageTime) < 2000) {
                android.util.Log.i("SmsModule", "Duplicate SMS event ignored: $sender")
                return true // Handled/ignored, we don't want to re-process
            }
            lastMessageHash = msgHash
            lastMessageTime = currentTime

            if (context.hasActiveReactInstance()) {
                val params = Arguments.createMap().apply {
                    putString("sender", sender)
                    putString("body", body)
                }
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onSmsReceived", params)
                return true
            }
            return false
        }
    }
}
