import java.net.URI

plugins {
    id("com.android.application")
}

val friemiBaseUrl = providers
    .gradleProperty("friemiBaseUrl")
    .orElse("https://www.friemi.com")
    .get()
    .trimEnd('/')
val friemiAppLinkHost = providers
    .gradleProperty("friemiAppLinkHost")
    .orElse(
        runCatching { URI(friemiBaseUrl).host }
            .getOrNull()
            ?.takeIf { it.isNotBlank() }
            ?: "www.friemi.com",
    )
    .get()

android {
    namespace = "com.friemi.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.friemi.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"

        buildConfigField("String", "FRIEMI_BASE_URL", "\"$friemiBaseUrl\"")
        buildConfigField("String", "FRIEMI_DEFAULT_PATH", "\"/mobile-home\"")
        manifestPlaceholders["friemiAppLinkHost"] = friemiAppLinkHost
        manifestPlaceholders["friemiUsesCleartextTraffic"] = "false"
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            manifestPlaceholders["friemiUsesCleartextTraffic"] = "true"
        }

        release {
            isMinifyEnabled = false
            manifestPlaceholders["friemiUsesCleartextTraffic"] = "false"
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.browser:browser:1.8.0")
}
