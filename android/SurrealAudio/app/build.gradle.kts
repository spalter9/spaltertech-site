// Android application module. This is the one part of the project that
// cannot be built or run in the sandbox that wrote it — it needs the
// Android Gradle Plugin (dl.google.com, blocked here) and a real SDK/
// emulator. It's written to be opened directly in Android Studio, where
// both of those are normal. The actual DSP math lives entirely in :dsp,
// which *is* built and verified here — this module is thin: capture
// audio, hand it to SurrealDsp, play it back.
plugins {
    id("com.android.application") version "8.5.2"
    id("org.jetbrains.kotlin.android") version "2.0.21"
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21"
}

android {
    namespace = "com.spaltertech.surrealaudio"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.spaltertech.surrealaudio"
        // AudioPlaybackCaptureConfiguration (capture-mode) requires API 29.
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(project(":dsp"))

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.1")

    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")
}
