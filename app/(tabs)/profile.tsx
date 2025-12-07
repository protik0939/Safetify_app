import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAppStore();

  const handleLogout = () => {
    logout();
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Logged out successfully',
    });
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {user && (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              
              <View style={styles.riskScoreContainer}>
                <Text style={styles.riskScoreLabel}>Safety Score</Text>
                <Text style={styles.riskScoreValue}>{user.riskScore}/100</Text>
                <View style={styles.riskScoreBar}>
                  <View 
                    style={[
                      styles.riskScoreFill, 
                      { 
                        width: `${user.riskScore}%`,
                        backgroundColor: user.riskScore > 70 ? '#22c55e' : user.riskScore > 40 ? '#eab308' : '#ef4444'
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Information</Text>
              
              <View style={styles.infoItem}>
                <Ionicons name="call" size={20} color="#94a3b8" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{user.phone}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="location" size={20} color="#94a3b8" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>
                    {user.location.latitude.toFixed(4)}, {user.location.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="calendar" size={20} color="#94a3b8" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
              {user.emergencyContacts.map((contact, index) => (
                <View key={index} style={styles.contactItem}>
                  <Ionicons name="people" size={20} color="#94a3b8" />
                  <Text style={styles.contactText}>{contact}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>
              
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="settings" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Privacy & Security</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="help-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Help & Support</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
                <Ionicons name="log-out" size={20} color="#ef4444" />
                <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },
  riskScoreContainer: {
    width: '100%',
    alignItems: 'center',
  },
  riskScoreLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  riskScoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  riskScoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  riskScoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoText: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 16,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    color: '#ef4444',
  },
});
