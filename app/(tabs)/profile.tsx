import { lastSectionStyle } from '@/constants/theme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
    cancelAllNotifications,
    clearBadge,
    sendCheckInReminder,
    sendDangerZoneWarning,
    sendEmergencyContactAlert,
    sendSOSAlert,
    sendSOSResolvedNotification,
} from '@/utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAppStore } from '../../store/useAppStore';
import { clearSessionToken } from '../../utils/authApi';

// ─── Small helper to show a toast after triggering a test notification ────────
function notifySuccess(label: string) {
  Toast.show({ type: 'success', text1: 'Notification Sent', text2: label });
}
function notifyInfo(label: string) {
  Toast.show({ type: 'info', text1: 'Scheduled', text2: label });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAppStore();

  // Push notification state from our hook (token, permission, last notification)
  const { expoPushToken, permissionGranted, error, notification } =
    usePushNotifications();

  const handleLogout = async () => {
    await clearSessionToken();
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

            {/* ═══════════════════════════════════════════════════════════
                  PUSH NOTIFICATIONS – learning & testing section
                  ═══════════════════════════════════════════════════════════ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Push Notifications</Text>

              {/* ── Status card ─────────────────────────────────────────── */}
              <View style={styles.notifStatusCard}>
                {/* Permission row */}
                <View style={styles.notifStatusRow}>
                  <Ionicons
                    name={permissionGranted ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={permissionGranted ? '#22c55e' : '#ef4444'}
                  />
                  <Text style={styles.notifStatusLabel}>Permission</Text>
                  <Text
                    style={[
                      styles.notifStatusValue,
                      { color: permissionGranted ? '#22c55e' : '#ef4444' },
                    ]}
                  >
                    {permissionGranted ? 'Granted' : 'Denied'}
                  </Text>
                </View>

                {/* Token row */}
                <View style={styles.notifStatusRow}>
                  <Ionicons name="key" size={18} color="#94a3b8" />
                  <Text style={styles.notifStatusLabel}>Push Token</Text>
                  <Text style={styles.notifTokenValue} numberOfLines={1} ellipsizeMode="middle">
                    {expoPushToken ?? 'Not available (use real device)'}
                  </Text>
                </View>

                {/* Error row (only rendered if there's an error) */}
                {error && (
                  <View style={styles.notifStatusRow}>
                    <Ionicons name="warning" size={18} color="#f59e0b" />
                    <Text style={[styles.notifStatusLabel, { color: '#f59e0b' }]}>
                      {error}
                    </Text>
                  </View>
                )}

                {/* Last received notification */}
                {notification && (
                  <View style={[styles.notifStatusRow, { marginTop: 8, flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <Text style={[styles.notifStatusLabel, { marginBottom: 4 }]}>
                      Last Received:
                    </Text>
                    <Text style={styles.notifLastTitle}>
                      {notification.request.content.title}
                    </Text>
                    <Text style={styles.notifLastBody}>
                      {notification.request.content.body}
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Explanation card ─────────────────────────────────────── */}
              <View style={styles.notifInfoCard}>
                <Text style={styles.notifInfoTitle}>How Push Notifications Work</Text>
                <Text style={styles.notifInfoText}>
                  {'1. App requests permission from the OS.\n'}
                  {'2. OS returns a push token (device identifier).\n'}
                  {'3. Token is sent to your backend server.\n'}
                  {'4. Server calls Expo Push API with token + message.\n'}
                  {'5. Expo relays it through FCM (Android) / APNs (iOS).\n'}
                  {'6. Device wakes up and shows the notification.\n\n'}
                  {'Local (test) notifications skip steps 3–5 and fire directly.'}
                </Text>
              </View>

              {/* ── Test buttons ─────────────────────────────────────────── */}
              <Text style={styles.notifTestTitle}>Fire a Test Notification</Text>

              <TouchableOpacity
                style={styles.notifButton}
                onPress={async () => {
                  await sendSOSAlert('Alex Johnson', 'Central Park, NY');
                  notifySuccess('SOS Alert fired immediately');
                }}
              >
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>SOS Alert (immediate)</Text>
                  <Text style={styles.notifBtnDesc}>Simulates a nearby SOS received from another user</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notifButton}
                onPress={async () => {
                  await sendDangerZoneWarning('Downtown District', 'high');
                  notifySuccess('Danger Zone warning fired');
                }}
              >
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>Danger Zone Warning (immediate)</Text>
                  <Text style={styles.notifBtnDesc}>Simulates entering a high-risk area</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notifButton}
                onPress={async () => {
                  await sendEmergencyContactAlert('Sarah (Emergency Contact)');
                  notifySuccess('Emergency contact alert fired');
                }}
              >
                <Ionicons name="people" size={20} color="#3b82f6" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>Emergency Contact Alert (immediate)</Text>
                  <Text style={styles.notifBtnDesc}>Simulates your contact triggering an SOS</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notifButton}
                onPress={async () => {
                  await sendSOSResolvedNotification();
                  notifySuccess('SOS Resolved notification fired');
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>SOS Resolved (immediate)</Text>
                  <Text style={styles.notifBtnDesc}>Simulates your SOS being marked resolved</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.notifButton, { borderColor: '#8b5cf6' }]}
                onPress={async () => {
                  await sendCheckInReminder(10);
                  notifyInfo('Check-In reminder fires in 10 seconds – background the app!');
                }}
              >
                <Ionicons name="timer" size={20} color="#8b5cf6" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>Check-In Reminder (10s delay)</Text>
                  <Text style={styles.notifBtnDesc}>
                    Scheduled for 10 s – background the app to see it arrive
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cancel / clear */}
              <View style={styles.notifActionRow}>
                <TouchableOpacity
                  style={styles.notifSmallBtn}
                  onPress={async () => {
                    await cancelAllNotifications();
                    Toast.show({ type: 'info', text1: 'Cancelled', text2: 'All pending notifications cancelled' });
                  }}
                >
                  <Ionicons name="ban" size={16} color="#94a3b8" />
                  <Text style={styles.notifSmallBtnText}>Cancel All Scheduled</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.notifSmallBtn}
                  onPress={async () => {
                    await clearBadge();
                    Toast.show({ type: 'info', text1: 'Badge Cleared', text2: 'App icon badge reset to 0' });
                  }}
                >
                  <Ionicons name="notifications-off" size={16} color="#94a3b8" />
                  <Text style={styles.notifSmallBtnText}>Clear Badge</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.section, lastSectionStyle]}>
              <Text style={styles.sectionTitle}>Actions</Text>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="settings" size={20} color="#fff" />
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

  // ── Push Notification section ──────────────────────────────────────────────
  notifStatusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  notifStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifStatusLabel: {
    fontSize: 13,
    color: '#94a3b8',
    flex: 1,
  },
  notifStatusValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  notifTokenValue: {
    fontSize: 11,
    color: '#cbd5e1',
    flex: 2,
  },
  notifLastTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  notifLastBody: {
    fontSize: 12,
    color: '#94a3b8',
  },
  notifInfoCard: {
    backgroundColor: '#0f2038',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1d4ed8',
  },
  notifInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#93c5fd',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notifInfoText: {
    fontSize: 12,
    color: '#93c5fd',
    lineHeight: 20,
  },
  notifTestTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  notifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  notifBtnText: {
    flex: 1,
  },
  notifBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  notifBtnDesc: {
    fontSize: 11,
    color: '#64748b',
  },
  notifActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  notifSmallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  notifSmallBtnText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
