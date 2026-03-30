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
      buildNumber: "1",
    },

    android: {
      package: "com.hdxquisiteliquors.app",
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: "#0B0B0F",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      permissions: [],
    },

    web: {
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      [
        "expo-router",
        isDev
          ? { origin: `https://${process.env.EXPO_PUBLIC_DOMAIN}/` }
          : {},
      ],
      "expo-font",
      "expo-web-browser",
      "expo-system-ui",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      eas: {
        projectId: "92b2241c-b2a8-4e99-9261-818f958c038d",
      },
    },
  };
};
