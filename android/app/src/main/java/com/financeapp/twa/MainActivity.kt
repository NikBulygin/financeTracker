package com.financeapp.twa

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.browser.customtabs.CustomTabsServiceConnection
import androidx.browser.customtabs.CustomTabsSession

class MainActivity : AppCompatActivity() {
    private var customTabsSession: CustomTabsSession? = null
    private var customTabsServiceConnection: CustomTabsServiceConnection? = null
    
    // Замените на ваш домен после деплоя
    private val twaUrl = "https://YOUR_DOMAIN.com"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Проверяем, открыто ли приложение через deep link
        val intent = intent
        val data: Uri? = intent.data
        
        val url = if (data != null && data.scheme == "https") {
            data.toString()
        } else {
            twaUrl
        }
        
        // Открываем TWA
        openTWA(url)
    }
    
    private fun openTWA(url: String) {
        val customTabsIntent = CustomTabsIntent.Builder(customTabsSession)
            .setShowTitle(true)
            .setToolbarColor(resources.getColor(android.R.color.black, theme))
            .build()
        
        customTabsIntent.launchUrl(this, Uri.parse(url))
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.data?.let { uri ->
            if (uri.scheme == "https") {
                openTWA(uri.toString())
            }
        }
    }
}

