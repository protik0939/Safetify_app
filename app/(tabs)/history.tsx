import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { useFocusEffect, router } from 'expo-router';
import { format } from 'date-fns';
import { AppColors } from '@/constants/theme';
import { getIncidentHistory, type IncidentRecord } from '../../utils/incidentApi';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const user = useAppStore((state) => state.user);
  const [history, setHistory] = useState<IncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHistory = useCallback(async (showLoadingIndicator = true) => {
    if (!user?.id) return;
    if (showLoadingIndicator) setIsLoading(true);
    try {
      const data = await getIncidentHistory(user.id);
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch incident history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory(true);
    }, [fetchHistory])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchHistory(false);
  }, [fetchHistory]);

  const handleCardPress = (incidentId: string) => {
    router.push({
      pathname: '/(tabs)/incidents',
      params: { viewIncidentId: incidentId },
    });
  };

  const getStatusBadgeStyle = (status: string | null) => {
    const norm = (status || 'active').toLowerCase();
    if (norm === 'resolved') {
      return { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' };
    }
    if (norm === 'cancelled') {
      return { bg: 'rgba(148, 163, 184, 0.1)', text: '#64748b' };
    }
    return { bg: 'rgba(240, 145, 41, 0.1)', text: '#f09129' }; // active
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SOS History</Text>
          <Text style={styles.headerSubtitle}>Your emergency request history</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed" size={60} color={AppColors.muted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
          <Text style={styles.emptyText}>Please log in to view your history</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SOS History</Text>
        <Text style={styles.headerSubtitle}>Your created or responded emergency requests</Text>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={AppColors.themeColor} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={AppColors.themeColor}
              colors={[AppColors.themeColor]}
            />
          }
        >
          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={80} color={AppColors.muted} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No History Yet</Text>
              <Text style={styles.emptyText}>
                Your SOS requests and the emergencies you help respond to will appear here.
              </Text>
            </View>
          ) : (
            history.map((incident) => {
              const isCreator = incident.userId === user.id;
              const statusColors = getStatusBadgeStyle(incident.status);
              const dateObj = new Date(incident.createdAt);
              const responders = incident.incidentResponders || [];

              return (
                <TouchableOpacity
                  key={incident.id}
                  style={styles.historyCard}
                  onPress={() => handleCardPress(incident.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                      {/* Status Badge */}
                      <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                        <Text style={[styles.badgeText, { color: statusColors.text }]}>
                          {(incident.status || 'ACTIVE').toUpperCase()}
                        </Text>
                      </View>

                      {/* Role Badge */}
                      {isCreator ? (
                        <View style={[styles.badge, styles.roleCreatorBadge]}>
                          <Ionicons name="alert-circle" size={12} color="#ef4444" style={styles.badgeIcon} />
                          <Text style={[styles.badgeText, { color: '#ef4444' }]}>YOUR SOS</Text>
                        </View>
                      ) : (
                        <View style={[styles.badge, styles.roleHelperBadge]}>
                          <Ionicons name="shield-checkmark" size={12} color="#22c55e" style={styles.badgeIcon} />
                          <Text style={[styles.badgeText, { color: '#22c55e' }]}>YOU HELPED</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={AppColors.muted} />
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.historyTitle}>
                      {incident.title || 'SOS Emergency Request'}
                    </Text>
                    <Text style={styles.historyDate}>
                      📅 {format(dateObj, 'MMM dd, yyyy - hh:mm a')}
                    </Text>
                    {incident.description ? (
                      <Text style={styles.historyDescription} numberOfLines={2}>
                        {incident.description}
                      </Text>
                    ) : null}

                    <View style={styles.divider} />

                    <View style={styles.relationInfo}>
                      {isCreator ? (
                        <Text style={styles.relationText}>
                          👥 {responders.length > 0
                            ? `${responders.length} helper${responders.length > 1 ? 's' : ''} went: ` +
                              responders.map(r => r.responder.name).join(', ')
                            : 'No helpers responded yet'}
                        </Text>
                      ) : (
                        <Text style={styles.relationText}>
                          👤 Victim: {incident.user?.name || incident.victim || 'Someone in need'}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: AppColors.background,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.foreground,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AppColors.muted,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // extra spacing for the navbar overlay
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AppColors.foreground,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: AppColors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  historyCard: {
    backgroundColor: AppColors.surfaceStrong,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: AppColors.foreground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeIcon: {
    marginRight: 4,
  },
  roleCreatorBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.16)',
  },
  roleHelperBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.16)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardBody: {
    gap: 6,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.foreground,
  },
  historyDate: {
    fontSize: 13,
    color: AppColors.muted,
  },
  historyDescription: {
    fontSize: 14,
    color: AppColors.textSoft,
    lineHeight: 20,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: 10,
  },
  relationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relationText: {
    fontSize: 13,
    color: AppColors.foreground,
    fontWeight: '500',
  },
});
