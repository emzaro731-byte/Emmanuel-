
# Add project-specific ProGuard rules here.

# React Native
-keep class com.facebook.react.** { *; }

# Keep JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}