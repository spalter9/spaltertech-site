// Pure-Kotlin/JVM module: the Surreal Audio DSP engine itself, with no
// Android dependency at all. This is deliberate, not incidental — it means
// the actual audio math can be verified with plain `gradle run`,
// independent of the Android SDK/emulator that :app needs, and without
// needing a test-framework dependency at all (kotlin-stdlib is the only
// thing this module needs, and only kotlin-stdlib — nothing else — is
// pulled in here on purpose).
plugins {
    id("org.jetbrains.kotlin.jvm") version "2.0.21"
    application
}

application {
    mainClass.set("com.spaltertech.surrealaudio.dsp.VerifyKt")
}
