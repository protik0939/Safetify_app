import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { format } from 'date-fns';

export default function HistoryScreen() {
  const { sosHistory } = useAppStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SOS History</Text>
        <Text style={styles.headerSubtitle}>Your emergency request history</Text>
      </View>

      <ScrollView style={styles.content}>
        {sosHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptyText}>
              Your SOS emergency requests will appear here
            </Text>
          </View>
        ) : (
          sosHistory.map((sos) => (
            <View key={sos.id} style={styles.historyCard}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{sos.status.toUpperCase()}</Text>
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyDate}>
                  {format(sos.createdAt, 'MMM dd, yyyy - hh:mm a')}
                </Text>
                <Text style={styles.historyDescription}>
                  {sos.description || 'Emergency SOS request'}
                </Text>
                <View style={styles.respondersInfo}>
                  <Text style={styles.respondersText}>
                    👥 {sos.respondents.length} responders
                  </Text>
                </View>
              </View>
            </View>
          ))
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyInfo: {
    gap: 8,
  },
  historyDate: {
    fontSize: 14,
    color: '#94a3b8',
  },
  historyDescription: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  respondersInfo: {
    marginTop: 8,
  },
  respondersText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
