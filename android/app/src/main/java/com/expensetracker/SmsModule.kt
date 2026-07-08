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

    private val expenseCreatedReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            android.util.Log.i("SmsModule", "expenseCreatedReceiver triggered. Action: ${intent.action}")
            if (intent.action == "com.expensetracker.EXPENSE_CREATED") {
                val reactContext = companionContext
                if (reactContext != null && reactContext.hasActiveReactInstance()) {
                    android.util.Log.i("SmsModule", "Emitting event 'onExpenseCreated' to React Native JS context")
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onExpenseCreated", null)
                } else {
                    android.util.Log.w("SmsModule", "React Context was null or inactive. Event skipped.")
                }
            }
        }
    }

    init {
        companionContext = reactContext
        
        // Dynamically register the local Expense Created broadcast receiver
        try {
            val expenseFilter = IntentFilter("com.expensetracker.EXPENSE_CREATED")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(expenseCreatedReceiver, expenseFilter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                reactContext.registerReceiver(expenseCreatedReceiver, expenseFilter)
            }
        } catch (e: Exception) {
            android.util.Log.e("SmsModule", "Failed to register dynamic expense created receiver: ${e.message}")
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
        val editor = sharedPref.edit()
        editor.putString("auth_token", token)
        editor.putString("api_url", apiUrl)
        editor.apply()
        android.util.Log.i("SmsModule", "Config saved to SharedPreferences. URL: $apiUrl")
    }

    @ReactMethod
    fun clearConfig() {
        val sharedPref = reactApplicationContext.getSharedPreferences("ExpenseTrackerPrefs", Context.MODE_PRIVATE)
        val editor = sharedPref.edit()
        editor.clear()
        editor.apply()
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
    fun addListener(eventName: String) {
        // Required for RCTDeviceEventEmitter lifecycle (Bridgeless Mode compatibility)
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RCTDeviceEventEmitter lifecycle (Bridgeless Mode compatibility)
    }

    companion object {
        private var companionContext: ReactApplicationContext? = null
    }
}
