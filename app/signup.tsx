import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from '@/components/AppToast';
import SafetifyLogo from '../assets/images/safetifyLogo.svg';
import { useAppStore } from '../store/useAppStore';
import { registerUser } from '../utils/authApi';
import { signInWithGoogle } from '../utils/googleAuth';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const router = useRouter();
  const { setUser, setSessionToken } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill all required fields',
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { user: apiUser, token } = await registerUser({ name, email, password, contactNo: phone });
      setSessionToken(token ?? null);
      setUser({
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        contactNo: phone ?? '',
        bio: apiUser.bio ?? '',
        role: apiUser.role ?? 'user',
        accountStatus: apiUser.accountStatus ?? 'active',
        emailVerified: apiUser.emailVerified ?? false,
        address: apiUser.address ?? '',
        bloodGroup: apiUser.bloodGroup ?? '',
        location: '',
        createdAt: new Date(apiUser.createdAt),
        emergencyContacts: [],
        riskScore: 0,
        image: apiUser.image ?? undefined,
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Account created successfully!',
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: err?.message ?? 'Something went wrong',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      const { user: apiUser, token } = await signInWithGoogle();
      setSessionToken(token ?? null);
      setUser({
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        contactNo: apiUser.contactNo ?? '',
        bio: apiUser.bio ?? '',
        role: apiUser.role ?? 'user',
        accountStatus: apiUser.accountStatus ?? 'active',
        emailVerified: apiUser.emailVerified ?? false,
        address: apiUser.address ?? '',
        bloodGroup: apiUser.bloodGroup ?? '',
        location: '',
        createdAt: new Date(apiUser.createdAt),
        emergencyContacts: [],
        riskScore: 0,
        image: apiUser.image ?? undefined,
      });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Google sign-in successful!',
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Google sign-in failed',
        text2: err?.message ?? 'Something went wrong',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <SafetifyLogo width={80} height={80} style={styles.logoImage} />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Safetify community</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor="#94a3b8"
              />
            </View>

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
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+880 1712345678"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignup}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.link} onPress={() => router.push('/login')}>
                Login
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
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
    fontWeight: '500',
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
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AppColors.border,
  },
  dividerText: {
    color: AppColors.foreground,
    fontSize: 14,
    marginHorizontal: 12,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: AppColors.foreground,
  },
  link: {
    color: AppColors.themeColor,
    fontWeight: '600',
  },
});
