package com.expensetracker

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.abs

class FloatingBubbleService : Service() {

    private lateinit var windowManager: WindowManager
    private var bubbleView: FrameLayout? = null
    private var cardView: LinearLayout? = null

    private lateinit var bubbleParams: WindowManager.LayoutParams
    private lateinit var cardParams: WindowManager.LayoutParams

    private var amount: String? = null
    private var merchant: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            amount = intent.getStringExtra("amount")
            merchant = intent.getStringExtra("merchant")
            android.util.Log.i("FloatingBubbleService", "onStartCommand received intent. amount: $amount, merchant: $merchant")
        } else {
            android.util.Log.w("FloatingBubbleService", "onStartCommand received null intent")
        }

        // Close any existing bubble before opening a new one
        removeOverlay()
        
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createBubbleView()
        createCardView()

        // Initially show only the bubble
        showBubble()

        return START_NOT_STICKY
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            resources.displayMetrics
        ).toInt()
    }

    private fun createBubbleView() {
        val context = this
        bubbleView = FrameLayout(context)

        // Make a beautiful transparent circle container with a thin white border
        val shape = GradientDrawable()
        shape.shape = GradientDrawable.OVAL
        shape.setColor(Color.TRANSPARENT)
        shape.setStroke(dpToPx(2f), Color.parseColor("#FFFFFF"))
        bubbleView?.background = shape
        
        // Add padding to keep the icon nicely nested inside the border
        val padding = dpToPx(4f)
        bubbleView?.setPadding(padding, padding, padding, padding)

        // Inner app launcher icon
        val icon = ImageView(context)
        icon.setImageResource(R.mipmap.ic_launcher_round)
        icon.scaleType = ImageView.ScaleType.FIT_CENTER
        
        // Clip the icon to a perfect circle to prevent square edges from leaking out
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            icon.outlineProvider = object : android.view.ViewOutlineProvider() {
                override fun getOutline(view: View, outline: android.graphics.Outline) {
                    outline.setOval(0, 0, view.width, view.height)
                }
            }
            icon.clipToOutline = true
        }

        val iconParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )
        iconParams.gravity = Gravity.CENTER
        bubbleView?.addView(icon, iconParams)

        // Setup Layout Params for the Bubble
        bubbleParams = WindowManager.LayoutParams(
            dpToPx(60f),
            dpToPx(60f),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )
        bubbleParams.gravity = Gravity.TOP or Gravity.START
        bubbleParams.x = dpToPx(20f)
        bubbleParams.y = dpToPx(150f)

        // Setup Drag & Click gesture listeners
        bubbleView?.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var clickStartTime = 0L

            override fun onTouch(v: View?, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = bubbleParams.x
                        initialY = bubbleParams.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        clickStartTime = System.currentTimeMillis()
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        bubbleParams.x = initialX + (event.rawX - initialTouchX).toInt()
                        bubbleParams.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager.updateViewLayout(bubbleView, bubbleParams)
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        val clickDuration = System.currentTimeMillis() - clickStartTime
                        val moveX = abs(event.rawX - initialTouchX)
                        val moveY = abs(event.rawY - initialTouchY)
                        
                        // If user just tapped the bubble (minimal movement & short click)
                        if (clickDuration < 200 && moveX < 10 && moveY < 10) {
                            showCard()
                        }
                        return true
                    }
                }
                return false
            }
        })
    }

    private fun createCardView() {
        val context = this
        
        // Root container for details card
        cardView = LinearLayout(context)
        cardView?.orientation = LinearLayout.VERTICAL
        cardView?.gravity = Gravity.CENTER_HORIZONTAL
        cardView?.setPadding(dpToPx(16f), dpToPx(16f), dpToPx(16f), dpToPx(16f))

        // Premium Dark Background
        val shape = GradientDrawable()
        shape.shape = GradientDrawable.RECTANGLE
        shape.setColor(Color.parseColor("#1E1E2C"))
        shape.cornerRadius = dpToPx(16f).toFloat()
        shape.setStroke(dpToPx(1.5f), Color.parseColor("#3E3E5C"))
        cardView?.background = shape

        // Title Info Text (Rs. X spent)
        val titleText = TextView(context)
        titleText.text = "Logged Rs. $amount spent"
        titleText.setTextColor(Color.WHITE)
        titleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        titleText.paint.isFakeBoldText = true
        titleText.gravity = Gravity.CENTER_HORIZONTAL
        val titleParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        titleParams.setMargins(0, 0, 0, dpToPx(12f))
        cardView?.addView(titleText, titleParams)

        // EditText for User's Note
        val input = EditText(context)
        input.hint = "Add details (e.g. coffee, lunch)"
        input.setHintTextColor(Color.parseColor("#888899"))
        input.setTextColor(Color.WHITE)
        input.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        input.setSingleLine(true)
        input.setPadding(dpToPx(12f), dpToPx(10f), dpToPx(12f), dpToPx(10f))
        
        val inputBg = GradientDrawable()
        inputBg.shape = GradientDrawable.RECTANGLE
        inputBg.setColor(Color.parseColor("#2D2D3F"))
        inputBg.cornerRadius = dpToPx(8f).toFloat()
        input.background = inputBg

        val inputParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        inputParams.setMargins(0, 0, 0, dpToPx(16f))
        cardView?.addView(input, inputParams)

        // Buttons Layout (Cancel / Done)
        val buttonsLayout = LinearLayout(context)
        buttonsLayout.orientation = LinearLayout.HORIZONTAL
        buttonsLayout.gravity = Gravity.END

        // Cancel Button
        val btnCancel = Button(context)
        btnCancel.text = "CANCEL"
        btnCancel.setTextColor(Color.parseColor("#FF4A4A"))
        btnCancel.background = null
        btnCancel.setOnClickListener {
            // Shrink back to bubble mode
            showBubble()
        }
        val cancelParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            dpToPx(40f)
        )
        cancelParams.setMargins(0, 0, dpToPx(8f), 0)
        buttonsLayout.addView(btnCancel, cancelParams)

        // Done Button
        val btnDone = Button(context)
        btnDone.text = "DONE"
        btnDone.setTextColor(Color.WHITE)
        
        val doneBg = GradientDrawable()
        doneBg.shape = GradientDrawable.RECTANGLE
        doneBg.setColor(Color.parseColor("#6C63FF"))
        doneBg.cornerRadius = dpToPx(8f).toFloat()
        btnDone.background = doneBg
        
        btnDone.setOnClickListener {
            val noteText = input.text.toString().trim()
            android.util.Log.i("FloatingBubbleService", "Done button clicked. Note: '$noteText'")
            if (noteText.isNotEmpty()) {
                val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
                imm.hideSoftInputFromWindow(input.windowToken, 0)

                android.util.Log.i("FloatingBubbleService", "Logging expense natively via background HTTP POST...")
                val context = this
                val currentAmount = amount ?: "0"
                createExpenseNatively(context, currentAmount, noteText)
                stopSelf()
            } else {
                android.util.Log.w("FloatingBubbleService", "Validation failed. Note is empty!")
            }
        }
        val doneParams = LinearLayout.LayoutParams(
            dpToPx(100f),
            dpToPx(40f)
        )
        buttonsLayout.addView(btnDone, doneParams)

        val layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        cardView?.addView(buttonsLayout, layoutParams)

        // Setup Layout Params for the Card
        cardParams = WindowManager.LayoutParams(
            dpToPx(280f),
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_DIM_BEHIND or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )
        cardParams.gravity = Gravity.CENTER
        cardParams.dimAmount = 0.5f // Dims the background to draw focus to the card
        cardParams.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
    }

    private fun showBubble() {
        try {
            // Remove card if open
            if (cardView?.parent != null) {
                windowManager.removeView(cardView)
            }
            
            // Add bubble if not present
            if (bubbleView?.parent == null) {
                windowManager.addView(bubbleView, bubbleParams)
            }
        } catch (e: Exception) {
            android.util.Log.e("FloatingBubbleService", "Failed to show bubble overlay: ${e.message}")
        }
    }

    private fun showCard() {
        try {
            // Remove bubble
            if (bubbleView?.parent != null) {
                windowManager.removeView(bubbleView)
            }
            
            // Add card overlay
            if (cardView?.parent == null) {
                windowManager.addView(cardView, cardParams)
                
                // Focus the EditText input and request keyboard
                val editText = cardView?.getChildAt(1) as? EditText
                editText?.requestFocus()
                editText?.postDelayed({
                    val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
                    imm.showSoftInput(editText, InputMethodManager.SHOW_IMPLICIT)
                }, 100)
            }
        } catch (e: Exception) {
            android.util.Log.e("FloatingBubbleService", "Failed to show card overlay: ${e.message}")
        }
    }

    private fun removeOverlay() {
        try {
            if (bubbleView?.parent != null) {
                windowManager.removeView(bubbleView)
            }
            if (cardView?.parent != null) {
                windowManager.removeView(cardView)
            }
        } catch (e: Exception) {
            android.util.Log.e("FloatingBubbleService", "Failed to remove views: ${e.message}")
        }
    }
    private fun createExpenseNatively(context: Context, amountStr: String, noteText: String) {
        Thread {
            try {
                val sharedPref = context.getSharedPreferences("ExpenseTrackerPrefs", Context.MODE_PRIVATE)
                val token = sharedPref.getString("auth_token", null)
                val apiUrl = sharedPref.getString("api_url", null)

                if (token == null || apiUrl == null) {
                    android.util.Log.e("FloatingBubbleService", "Missing config in SharedPreferences. Token exists: ${token != null}, URL: $apiUrl")
                    return@Thread
                }

                // Call POST /expenses
                val url = java.net.URL("$apiUrl/expenses")
                android.util.Log.i("FloatingBubbleService", "Connecting to background endpoint: $url")
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $token")
                conn.doOutput = true

                val jsonBody = org.json.JSONObject().apply {
                    put("amount", amountStr.toDouble())
                    put("note", noteText)
                }
                
                val postDataBytes = jsonBody.toString().toByteArray(Charsets.UTF_8)
                conn.setRequestProperty("Content-Length", postDataBytes.size.toString())

                conn.outputStream.use { os ->
                    os.write(postDataBytes)
                    os.flush()
                }

                val responseCode = conn.responseCode
                android.util.Log.i("FloatingBubbleService", "Natively created expense. HTTP Status: $responseCode")
                if (responseCode == java.net.HttpURLConnection.HTTP_CREATED || responseCode == java.net.HttpURLConnection.HTTP_OK) {
                    android.util.Log.i("FloatingBubbleService", "Background expense created successfully. Broadcasting com.expensetracker.EXPENSE_CREATED...")
                    val broadcastIntent = Intent("com.expensetracker.EXPENSE_CREATED").apply {
                        setPackage(context.packageName)
                    }
                    context.sendBroadcast(broadcastIntent)
                } else {
                    conn.errorStream?.use { err ->
                        val response = err.bufferedReader().use { it.readText() }
                        android.util.Log.e("FloatingBubbleService", "API Error Response: $response")
                    }
                }
                conn.disconnect()
            } catch (e: Exception) {
                android.util.Log.e("FloatingBubbleService", "Error posting native expense: ${e.message}", e)
            }
        }.start()
    }
    override fun onDestroy() {
        super.onDestroy()
        removeOverlay()
    }
}
