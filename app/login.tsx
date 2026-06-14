import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "@/components/AppToast";
import SafetifyLogo from "../assets/images/safetifyLogo.svg";
import { useAppStore } from "../store/useAppStore";
import { loginUser } from "../utils/authApi";
import { AppColors } from "@/constants/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setSessionToken } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill all fields",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { user: apiUser, token } = await loginUser({ email, password });
      setSessionToken(token ?? null);
      setUser({
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        phone: "",
        location: { latitude: 0, longitude: 0, timestamp: new Date() },
        createdAt: new Date(apiUser.createdAt),
        emergencyContacts: [],
        riskScore: 0,
        avatar: apiUser.image ?? undefined,
      });
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Login successful!",
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Login failed",
        text2: err?.message ?? "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail(process.env.EXPO_PUBLIC_DEMO_LOGIN_EMAIL);
    setPassword(process.env.EXPO_PUBLIC_DEMO_LOGIN_PASSWORD);

    Toast.show({
      type: "success",
      text1: "Demo credentials loaded",
    });
  };

  

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <SafetifyLogo width={80} height={80} style={styles.logoImage} />
          <Text style={styles.title}>Safetify</Text>
          <Text style={styles.subtitle}>Community Safety Platform</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don&apos;t have an account?{" "}
            <Text style={styles.link} onPress={() => router.push("/signup")}>
              Sign up
            </Text>
          </Text>
        </View>

        <View style={styles.demoCredentials}>
          <View style={styles.demoHeader}>
            <Text style={styles.demoTitle}>Demo Credentials</Text>

            <TouchableOpacity
              style={styles.useButton}
              onPress={fillDemoCredentials}
            >
              <Text style={styles.useButtonText}>Use</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.demoText}>Email: {process.env.EXPO_PUBLIC_DEMO_LOGIN_EMAIL}</Text>
          <Text style={styles.demoText}>Password: {process.env.EXPO_PUBLIC_DEMO_LOGIN_PASSWORD}</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoImage: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: AppColors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AppColors.foreground,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: AppColors.foreground,
  },
  input: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: AppColors.foreground,
  },
  button: {
    backgroundColor: AppColors.themeColor,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: AppColors.foreground,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: AppColors.foreground,
  },
  link: {
    color: AppColors.themeColor,
    fontWeight: "600",
  },
  demoCredentials: {
    marginTop: 24,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
  },
  demoTitle: {
    fontSize: 12,
    color: AppColors.foreground,
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: AppColors.foreground,
  },
  demoHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},

useButton: {
  backgroundColor: AppColors.themeColor,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
},

useButtonText: {
  color: AppColors.foreground,
  fontSize: 12,
  fontWeight: '600',
},
});
