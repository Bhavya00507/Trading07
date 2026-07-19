package com.trading.platform

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import java.util.ArrayList

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var splashView: View
    private lateinit var statusTextView: TextView
    private lateinit var progressBar: ProgressBar
    private var activeBackendUrl = "https://api.myserver.com/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize UI component bindings
        webView = findViewById(R.id.webview)
        splashView = findViewById(R.id.splash_view)
        statusTextView = findViewById(R.id.status_text)
        progressBar = findViewById(R.id.progress_bar)

        // Execute startup sequence
        initApp()
    }

    private fun checkBackendHealthy(urlStr: String): Boolean {
        return try {
            val url = java.net.URL(urlStr)
            val conn = url.openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 800
            conn.readTimeout = 800
            val code = conn.responseCode
            conn.disconnect()
            code == 200
        } catch (e: Exception) {
            false
        }
    }

    private fun initApp() {
        statusTextView.text = "Checking connection to host PC backend..."
        Thread {
            val candidateHosts = ArrayList<String>()
            candidateHosts.add("10.0.2.2") // Emulator host loopback
            candidateHosts.add("192.168.1.3") // Current dev machine static LAN IP
            candidateHosts.add("192.168.1.7") // Dev machine static LAN IP fallback
            
            var foundHost: String? = null
            for (host in candidateHosts) {
                val testUrl = "http://$host:8000/health"
                Log.d("MainActivity", "Probing host backend at $testUrl ...")
                if (checkBackendHealthy(testUrl)) {
                    foundHost = host
                    break
                }
            }
            
            runOnUiThread {
                if (foundHost != null) {
                    activeBackendUrl = "http://$foundHost:8000/"
                    Log.i("MainActivity", "Found active host PC backend at $activeBackendUrl. Loading host frontend.")
                } else {
                    activeBackendUrl = "https://api.myserver.com/"
                    Log.i("MainActivity", "No host PC backend found. Defaulting to production centralized backend: $activeBackendUrl")
                }
                setupAndLoadWebView()
            }
        }.start()
    }

    private fun setupAndLoadWebView() {
        statusTextView.text = "Loading user interface..."
        
        // Configure WebView Client Settings
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.mediaPlaybackRequiresUserGesture = false
        // Disable cache to prevent loading stale assets
        settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE

        // Access permissions for local resources
        settings.allowFileAccess = true
        settings.allowContentAccess = true

        // Configure Mixed Content and Cookies support
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        val cookieManager = android.webkit.CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true)
        }

        // Clear WebView cache programmatically
        webView.clearCache(true)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                // Keep all page transitions and links running internally inside our view frame
                return false
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                Log.e("WebViewError", "Failed to fetch / load resource: ${request?.url} - Description: ${error?.description} (Code: ${error?.errorCode})")
            }

            override fun onReceivedHttpError(view: WebView?, request: WebResourceRequest?, errorResponse: WebResourceResponse?) {
                Log.e("WebViewError", "HTTP error on resource: ${request?.url} - Status Code: ${errorResponse?.statusCode}")
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Hide splash screen when fully loaded
                splashView.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                consoleMessage?.let {
                    Log.d(
                        "WEBVIEW",
                        "${it.messageLevel()} ${it.sourceId()}:${it.lineNumber()} ${it.message()}"
                    )
                }
                return true
            }
        }

        // Load page from dynamic backend URL
        webView.loadUrl(activeBackendUrl)
    }

    private fun showFatalErrorDialog(message: String) {
        runOnUiThread {
            AlertDialog.Builder(this)
                .setTitle("Fatal Startup Error")
                .setMessage(message)
                .setCancelable(false)
                .setPositiveButton("Exit") { _, _ ->
                    finish()
                }
                .show()
        }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.visibility == View.VISIBLE && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
