package com.expensetracker

import android.content.Context
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val smsReceiver = SmsReceiver()

    init {
        companionContext = reactContext
        
        // Dynamically register the receiver for live sessions (bypasses ColorOS/Oppo manifest-blocking limits)
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
    }

    override fun getName(): String = "SmsModule"

    @ReactMethod
    fun initModule() {
        android.util.Log.i("SmsModule", "SMS Module initialized from JS context")
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

        fun sendSmsEvent(sender: String, body: String) {
            val context = companionContext ?: return
            
            // Deduplicate incoming events within a 2-second window (prevents duplicate manifest + dynamic triggers)
            val msgHash = "$sender|$body"
            val currentTime = System.currentTimeMillis()
            if (msgHash == lastMessageHash && (currentTime - lastMessageTime) < 2000) {
                android.util.Log.i("SmsModule", "Duplicate SMS event ignored: $sender")
                return
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
            }
        }
    }
}
