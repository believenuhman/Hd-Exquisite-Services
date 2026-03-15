import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDev = !!process.env.EXPO_PUBLIC_DOMAIN;

  return {
    ...config,
    name: "HD Xquisite Liquors",
    slug: "hd-xquisite-liquors",
    version: "1.0.0",
    orientation: "portrait" as const,
    icon: "./assets/images/icon.png",
    scheme: "hdxquisiteliquors",
    userInterfaceStyle: "dark" as const,
    newArchEnabled: true,

    // Disable OTA updates for standalone builds — no EAS Update server needed
    updates: {
      enabled: false,
    },

    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain" as const,
      backgroundColor: "#0B0B0F",
    },

    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.hdxquisiteliquors.app",
    },

    android: {
      package: "com.hdxquisiteliquors.app",
      adaptiveIcon: {
        backgroundColor: "#0B0B0F",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      // Required permissions — only declare what the app actually uses
      permissions: [],
    },

    web: {
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      [
        "expo-router",
        // Only set origin in dev (Replit web preview).
        // In production EAS builds, EXPO_PUBLIC_DOMAIN is not set, so origin is
        // omitted — expo-router uses the native scheme (hdxquisiteliquors://)
        isDev
          ? { origin: `https://${process.env.EXPO_PUBLIC_DOMAIN}/` }
          : {},
      ],
      "expo-font",
      "expo-web-browser",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      // Only include eas.projectId — remove router.origin from extra
      eas: {
        projectId: "92b2241c-b2a8-4e99-9261-818f958c038d",
      },
    },
  };
};
