plugins {
    id("com.android.application")
}

// Номер сборки: в CI берётся из номера запуска GitHub Actions (всегда растёт — нужно для Play).
val buildNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

android {
    namespace = "io.github.rulonoboev88.firstgame"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.rulonoboev88.firstgame"
        minSdk = 26
        targetSdk = 36
        versionCode = buildNumber
        versionName = "0.1.$buildNumber"
    }

    signingConfigs {
        create("release") {
            val ks = System.getenv("FG_KEYSTORE_PATH")
            if (ks != null && file(ks).exists()) {
                storeFile = file(ks)
                storePassword = System.getenv("FG_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("FG_KEY_ALIAS")
                keyPassword = System.getenv("FG_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            val rel = signingConfigs.getByName("release")
            signingConfig = if (rel.storeFile != null) rel else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    androidResources {
        // Не сжимать звуки/картинки игр — WebView читает их напрямую.
        noCompress += listOf("ogg", "mp3", "wav", "png", "webp")
    }

    dependenciesInfo {
        // Для F-Droid: не вшивать зашифрованный блок зависимостей Google.
        includeInApk = false
        includeInBundle = false
    }
}
