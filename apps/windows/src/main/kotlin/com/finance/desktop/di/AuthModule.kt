// SPDX-License-Identifier: BUSL-1.1

package com.finance.desktop.di

import com.finance.desktop.data.repository.AuthRepository
import com.finance.desktop.data.repository.impl.DesktopAuthRepository
import com.finance.sync.auth.TokenManager
import com.finance.sync.auth.TokenStorage
import io.ktor.client.*
import io.ktor.client.engine.okhttp.*
import org.koin.dsl.module

/**
 * Koin module for authentication infrastructure.
 *
 * Provides:
 * - Ktor [HttpClient] with OkHttp engine for Supabase REST API calls
 * - KMP [TokenStorage] and [TokenManager] for token lifecycle
 * - [DesktopAuthRepository] binding [AuthRepository] interface
 *
 * Supabase configuration is read from environment variables:
 * - `SUPABASE_URL` — project URL (e.g., "https://xxx.supabase.co")
 * - `SUPABASE_ANON_KEY` — public/anonymous API key
 *
 * Fallback values are provided for local development.
 */
val authModule = module {
    // Ktor HTTP client for auth API calls
    single {
        HttpClient(OkHttp) {
            engine {
                config {
                    followRedirects(true)
                    connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                    readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                }
            }
        }
    }

    // KMP token storage and manager
    single { TokenStorage() }
    single { TokenManager(get()) }

    // Auth repository
    single<AuthRepository> {
        DesktopAuthRepository(
            httpClient = get(),
            supabaseUrl = System.getenv("SUPABASE_URL") ?: "https://finance.supabase.co",
            supabaseAnonKey = System.getenv("SUPABASE_ANON_KEY") ?: "",
            secureTokenStorage = get(),
            tokenManager = get(),
        )
    }
}
