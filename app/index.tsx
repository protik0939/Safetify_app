import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import SafetifyLogo from '../assets/images/safetifyLogo.svg';
import { useAppStore } from '../store/useAppStore';
import { AppColors } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAppStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <SafetifyLogo width={80} height={80} style={styles.logoImage} />
        <Text style={styles.title}>Safetify</Text>
        <Text style={styles.subtitle}>Community Safety Platform</Text>
      </View>
      <ActivityIndicator size="large" color="#f0912b" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: AppColors.themeColor,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AppColors.foreground,
  },
  loader: {
    marginTop: 32,
  },
});
