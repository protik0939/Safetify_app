import SOSButton from '@/components/SOSButton';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

let BlurView: typeof import('expo-blur').BlurView | null = null;

if (Platform.OS === 'ios') {
  try {
    BlurView = require('expo-blur').BlurView;
  } catch {
    BlurView = null;
  }
}

function TabBarBackground() {
  if (BlurView) {
    return <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />;
  }

  return <View style={styles.fallbackTabBarBackground} />;
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: AppColors.themeColor,
          tabBarInactiveTintColor: '#8A8A8A',
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 2,
            borderTopColor: '#fff7ed',
            paddingBottom: 8,
            paddingHorizontal: 10,
            paddingTop: 8,
            height: 70,
            elevation: 0,
            shadowOpacity: 0,
            margin: 5,
            borderRadius: 50,
            overflow: 'hidden',
            position: 'absolute',
          },
          tabBarBackground: () => <TabBarBackground />,
          headerStyle: {
            backgroundColor: AppColors.themeColor,
          },
          headerTintColor: AppColors.foreground,
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="sos-placeholder"
          options={{
            title: '',
            tabBarIcon: () => null,
            tabBarButton: () => <View style={{ width: 80 }} />,
          }}
        />
        <Tabs.Screen
          name="incidents"
          options={{
            title: 'Incidents',
            tabBarIcon: ({ color, size }) => <Ionicons name="warning" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
      </Tabs>
      <SOSButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackTabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff7edE6',
  },
});
