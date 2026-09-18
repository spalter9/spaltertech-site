// Root build file. Deliberately declares nothing — each module applies its
// own plugins in its own build.gradle.kts. This keeps `:dsp` configurable
// and runnable with plain `gradle :dsp:run` without ever needing the
// Android Gradle Plugin resolved, which requires dl.google.com — not
// reachable from every environment (this one included), but always
// reachable from a normal Android Studio install, which is where `:app`
// is meant to be opened and built.
