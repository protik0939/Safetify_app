import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";

type ToastType = "success" | "error" | "info" | (string & {});
type ToastPosition = "top" | "bottom";

type ToastShowParams = {
  type?: ToastType;
  text1?: string;
  text2?: string;
  position?: ToastPosition;
  autoHide?: boolean;
  visibilityTime?: number;
  duration?: number;
  topOffset?: number;
  bottomOffset?: number;
  onShow?: () => void;
  onHide?: () => void;
  onPress?: () => void;
};

type VisibleToast = Required<
  Pick<ToastShowParams, "type" | "position" | "autoHide" | "topOffset" | "bottomOffset">
> &
  Pick<ToastShowParams, "text1" | "text2" | "onHide" | "onPress"> & {
    id: number;
    visibilityTime: number;
  };

type ToastEvent =
  | {
      type: "show";
      params: ToastShowParams;
    }
  | {
      type: "hide";
    };

type ToastListener = (event: ToastEvent) => void;

const DEFAULT_TOP_OFFSET = 120;
const DEFAULT_BOTTOM_OFFSET = 64;
const DEFAULT_VISIBILITY_TIME = 4000;
const FADE_DURATION = 220;
const TOAST_ACCENTS: Record<string, string> = {
  success: "#f09129",
  error: "#ef4444",
  info: "#3b82f6",
};

const listeners = new Set<ToastListener>();

function notify(event: ToastEvent) {
  listeners.forEach((listener) => listener(event));
}

function subscribe(listener: ToastListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function showToast(params: ToastShowParams) {
  notify({ type: "show", params });
}

function hideToast() {
  notify({ type: "hide" });
}

function AppToastHost() {
  const [toast, setToast] = useState<VisibleToast | null>(null);
  const activeToast = useRef<VisibleToast | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hideCurrentToast = useCallback(
    (onHidden?: () => void) => {
      clearHideTimer();
      opacity.stopAnimation();

      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;

        activeToast.current = null;
        setToast(null);
        onHidden?.();
      });
    },
    [clearHideTimer, opacity]
  );

  const showCurrentToast = useCallback(
    (params: ToastShowParams) => {
      const nextToast: VisibleToast = {
        id: Date.now(),
        type: params.type ?? "success",
        text1: params.text1,
        text2: params.text2,
        position: params.position ?? "top",
        autoHide: params.autoHide ?? true,
        visibilityTime:
          params.duration ?? params.visibilityTime ?? DEFAULT_VISIBILITY_TIME,
        topOffset: params.topOffset ?? DEFAULT_TOP_OFFSET,
        bottomOffset: params.bottomOffset ?? DEFAULT_BOTTOM_OFFSET,
        onHide: params.onHide,
        onPress: params.onPress,
      };

      clearHideTimer();
      opacity.stopAnimation();
      opacity.setValue(0);
      activeToast.current = nextToast;
      setToast(nextToast);
      params.onShow?.();

      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start();

      if (nextToast.autoHide) {
        hideTimer.current = setTimeout(() => {
          if (activeToast.current?.id === nextToast.id) {
            hideCurrentToast(nextToast.onHide);
          }
        }, nextToast.visibilityTime);
      }
    },
    [clearHideTimer, hideCurrentToast, opacity]
  );

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type === "show") {
        showCurrentToast(event.params);
        return;
      }

      hideCurrentToast(activeToast.current?.onHide);
    });

    return () => {
      unsubscribe();
      clearHideTimer();
    };
  }, [clearHideTimer, hideCurrentToast, showCurrentToast]);

  if (!toast) return null;

  const placementStyle: ViewStyle =
    toast.position === "bottom"
      ? { bottom: toast.bottomOffset }
      : { top: toast.topOffset };
  const accentColor = TOAST_ACCENTS[toast.type] ?? TOAST_ACCENTS.info;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.host, placementStyle, { opacity }]}
    >
      <TouchableOpacity
        activeOpacity={toast.onPress ? 0.9 : 1}
        disabled={!toast.onPress}
        onPress={toast.onPress}
        style={styles.toast}
      >
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={styles.content}>
          {!!toast.text1 && <Text style={styles.title}>{toast.text1}</Text>}
          {!!toast.text2 && <Text style={styles.message}>{toast.text2}</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

AppToastHost.show = showToast;
AppToastHost.hide = hideToast;

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    minHeight: 64,
    overflow: "hidden",
    flexDirection: "row",
    borderRadius: 8,
    backgroundColor: "#fff7ed",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  accent: {
    width: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
  },
  title: {
    color: "#1e315f",
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    marginTop: 2,
    color: "rgba(30, 49, 95, 0.68)",
    fontSize: 13,
    lineHeight: 18,
  },
});

export default AppToastHost as typeof AppToastHost & {
  show: typeof showToast;
  hide: typeof hideToast;
};
