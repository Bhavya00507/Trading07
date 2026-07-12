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
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var splashView: View
    private lateinit var statusTextView: TextView
    private lateinit var progressBar: ProgressBar

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

    private fun initApp() {
        try {
            // 1. Extract non-python asset resources to filesDir so Python standard I/O works seamlessly
            copyAssetsToFilesDir()

            // 2. Initialize Chaquopy Python Runtime
            Log.i("MainActivity", "Python.start() starting...")
            if (!Python.isStarted()) {
                Python.start(AndroidPlatform(this))
            }
            Log.i("MainActivity", "Python.start() completed successfully.")

            // 3. Start Python FastAPI Backend in background worker thread
            startBackendServer()

            // 4. Poll health check API endpoint until responsive
            startHealthCheckLoop()

        } catch (e: Exception) {
            Log.e("MainActivity", "App initialization failed:", e)
            showFatalErrorDialog("App initialization failed:\n${e.message}\n\n${Log.getStackTraceString(e)}")
        }
    }

    private fun startBackendServer() {
        Log.i("MainActivity", "Starting uvicorn backend thread...")
        Thread {
            try {
                val py = Python.getInstance()
                // app.main_android corresponds to backend/app/main_android.py packaged inside the APK
                val mainModule = py.getModule("app.main_android")
                mainModule.callAttr("start_server", filesDir.absolutePath)
            } catch (e: Exception) {
                Log.e("MainActivity", "Fatal python error in background thread:", e)
                val pythonTraceback = getPythonTraceback()
                showFatalErrorDialog("Local Server Failure:\n${e.message}\n\n$pythonTraceback")
            }
        }.start()
    }

    private fun startHealthCheckLoop() {
        val healthUrl = java.net.URL("http://127.0.0.1:8000/health")
        val pingUrl = java.net.URL("http://127.0.0.1:8000/ping")
        var attempts = 0
        val maxAttempts = 60
        val handler = Handler(Looper.getMainLooper())

        val checkRunnable = object : Runnable {
            override fun run() {
                attempts++
                statusTextView.text = "Starting backend core services (attempt $attempts/$maxAttempts)..."
                Log.d("MainActivity", "Polling /health and /ping - attempt $attempts/$maxAttempts...")

                Thread {
                    var isHealthy = false
                    try {
                        // Check health endpoint
                        val healthConn = healthUrl.openConnection() as java.net.HttpURLConnection
                        healthConn.requestMethod = "GET"
                        healthConn.connectTimeout = 1000
                        healthConn.readTimeout = 1000
                        val healthCode = healthConn.responseCode
                        healthConn.disconnect()

                        if (healthCode == 200) {
                            // Check ping endpoint
                            val pingConn = pingUrl.openConnection() as java.net.HttpURLConnection
                            pingConn.requestMethod = "GET"
                            pingConn.connectTimeout = 1000
                            pingConn.readTimeout = 1000
                            val pingCode = pingConn.responseCode
                            pingConn.disconnect()

                            if (pingCode == 200) {
                                isHealthy = true
                            }
                        }
                    } catch (e: Exception) {
                        // Connection failed, backend not ready yet
                    }

                    handler.post {
                        if (isHealthy) {
                            Log.i("MainActivity", "Success - /health and /ping returned HTTP 200 after $attempts seconds!")
                            setupAndLoadWebView()
                        } else {
                            if (attempts < maxAttempts) {
                                handler.postDelayed(this, 1000)
                            } else {
                                Log.e("MainActivity", "Timeout - /health/ping failed to return HTTP 200 after 60 attempts.")
                                val pythonTraceback = getPythonTraceback()
                                showFatalErrorDialog("Initialization Timeout:\nBackend core failed to boot within 60 seconds.\n\nPython Exception Traceback:\n$pythonTraceback")
                            }
                        }
                    }
                }.start()
            }
        }
        handler.post(checkRunnable)
    }

    private fun getPythonTraceback(): String {
        return try {
            if (Python.isStarted()) {
                val py = Python.getInstance()
                val mainModule = py.getModule("app.main_android")
                mainModule.callAttr("get_startup_error").toString()
            } else {
                "Python runtime not started."
            }
        } catch (e: Exception) {
            "Failed to retrieve Python traceback: ${e.message}"
        }
    }

    private fun showFatalErrorDialog(message: String) {
        runOnUiThread {
            statusTextView.text = "Fatal Error occurred."
            progressBar.visibility = View.GONE
            
            AlertDialog.Builder(this)
                .setTitle("Backend Startup Failure")
                .setMessage(message)
                .setPositiveButton("Exit App") { _, _ ->
                    finishAffinity()
                }
                .setCancelable(false)
                .show()
        }
    }

    private fun setupAndLoadWebView() {
        splashView.visibility = View.GONE
        webView.visibility = View.VISIBLE

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

        // Load page from local loopback address served by the FastAPI web service
        webView.loadUrl("http://127.0.0.1:8000/")
    }

    private fun copyAssetsToFilesDir() {
        Log.i("MainActivity", "Clearing old extracted assets in internal storage...")
        val distDir = File(filesDir, "dist")
        if (distDir.exists()) {
            distDir.deleteRecursively()
        }
        val alembicDir = File(filesDir, "alembic")
        if (alembicDir.exists()) {
            alembicDir.deleteRecursively()
        }
        val alembicIniFile = File(filesDir, "alembic.ini")
        if (alembicIniFile.exists()) {
            alembicIniFile.delete()
        }

        Log.i("MainActivity", "Copying assets starting...")
        copyAssetFolder("dist", distDir.absolutePath)
        copyAssetFolder("alembic", alembicDir.absolutePath)
        copyAssetFile("alembic.ini", alembicIniFile.absolutePath)
        Log.i("MainActivity", "Copying assets completed successfully.")
    }

    private fun copyAssetFolder(assetFolder: String, targetFolder: String) {
        val assetManager = assets
        var files: Array<String>? = null
        try {
            files = assetManager.list(assetFolder)
        } catch (e: IOException) {
            Log.e("MainActivity", "Failed to list assets: $assetFolder", e)
        }

        if (files == null || files.isEmpty()) {
            copyAssetFile(assetFolder, targetFolder)
        } else {
            val targetDir = File(targetFolder)
            if (!targetDir.exists()) {
                targetDir.mkdirs()
            }
            for (filename in files) {
                copyAssetFolder("$assetFolder/$filename", "$targetFolder/$filename")
            }
        }
    }

    private fun copyAssetFile(assetPath: String, targetPath: String) {
        val targetFile = File(targetPath)
        // Always overwrite on copy to handle upgrades and clean states
        if (targetFile.exists()) {
            targetFile.delete()
        }
        try {
            assets.open(assetPath).use { inStream ->
                FileOutputStream(targetFile).use { outStream ->
                    val buffer = ByteArray(1024 * 4)
                    var read: Int
                    while (inStream.read(buffer).also { read = it } != -1) {
                        outStream.write(buffer, 0, read)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to copy asset file $assetPath to $targetPath", e)
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
