/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#f09129';
const tintColorDark = '#f09129';

export const AppColors = {
  background: '#FFFFFF',
  themeColor: '#f09129',
  foreground: '#1e315f',
  surface: '#fff7ed',
  surfaceStrong: '#ffffff',
  surfaceSoft: '#fffaf2',
  border: 'rgba(30, 49, 95, 0.16)',
  borderStrong: 'rgba(30, 49, 95, 0.28)',
  muted: 'rgba(30, 49, 95, 0.68)',
  mutedStrong: '#94a3b8',
  text: '#1e315f',
  textSoft: '#475569',
  white: '#ffffff',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#22c55e',
};

export const Colors = {
  light: {
    text: AppColors.foreground,
    background: AppColors.background,
    tint: tintColorLight,
    icon: AppColors.foreground,
    tabIconDefault: AppColors.muted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: AppColors.foreground,
    background: AppColors.background,
    tint: tintColorDark,
    icon: AppColors.foreground,
    tabIconDefault: AppColors.muted,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});


export const lastSectionStyle = {
  paddingBottom: 100,
};
