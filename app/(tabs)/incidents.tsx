import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { generateMockIncidentDetails } from '../../utils/mockData';
import { format } from 'date-fns';
import type { IncidentDetail } from '../../types';

export default function IncidentsScreen() {
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);

  useEffect(() => {
    setIncidents(generateMockIncidentDetails());
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      default:
        return '#3b82f6';
    }
  };

  if (selectedIncident) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedIncident(null)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.detailCard}>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(selectedIncident.severity) }]}>
              <Text style={styles.severityText}>{selectedIncident.severity.toUpperCase()}</Text>
            </View>
            
            <Text style={styles.detailTitle}>{selectedIncident.title}</Text>
            <Text style={styles.detailDate}>
              {format(selectedIncident.date, 'MMM dd, yyyy - hh:mm a')}
            </Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.detailDescription}>{selectedIncident.description}</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{selectedIncident.deathToll}</Text>
                <Text style={styles.statLabel}>Deaths</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{selectedIncident.injuryCount}</Text>
                <Text style={styles.statLabel}>Injuries</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{selectedIncident.peopleHelped}</Text>
                <Text style={styles.statLabel}>Helpers</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Victim</Text>
              <Text style={styles.infoValue}>{selectedIncident.victim}</Text>
            </View>
            
            {selectedIncident.attackers !== 'N/A' && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Attackers</Text>
                <Text style={styles.infoValue}>{selectedIncident.attackers}</Text>
              </View>
            )}
            
            <View style={styles.divider} />
            
            <Text style={styles.storiesTitle}>📖 Incident Stories</Text>
            {selectedIncident.stories.map((story, index) => (
              <View key={index} style={styles.storyItem}>
                <Text style={styles.storyBullet}>•</Text>
                <Text style={styles.storyText}>{story}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incident Reports</Text>
        <Text style={styles.headerSubtitle}>Recent safety incidents in your area</Text>
      </View>

      <ScrollView style={styles.content}>
        {incidents.map((incident) => (
          <TouchableOpacity
            key={incident.id}
            style={styles.incidentCard}
            onPress={() => setSelectedIncident(incident)}
          >
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(incident.severity) }]}>
              <Text style={styles.severityText}>{incident.severity.toUpperCase()}</Text>
            </View>
            
            <Text style={styles.incidentTitle}>{incident.title}</Text>
            <Text style={styles.incidentDate}>
              {format(incident.date, 'MMM dd, yyyy')}
            </Text>
            <Text style={styles.incidentDescription} numberOfLines={2}>
              {incident.description}
            </Text>
            
            <View style={styles.incidentStats}>
              <Text style={styles.incidentStat}>💀 {incident.deathToll}</Text>
              <Text style={styles.incidentStat}>🤕 {incident.injuryCount}</Text>
              <Text style={styles.incidentStat}>👥 {incident.peopleHelped}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  backButton: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  incidentCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  incidentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  incidentDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  incidentDescription: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 12,
  },
  incidentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  incidentStat: {
    fontSize: 14,
    color: '#94a3b8',
  },
  detailCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  detailDate: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  detailDescription: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 24,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  infoSection: {
    marginBottom: 12,
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
  storiesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  storyItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  storyBullet: {
    fontSize: 16,
    color: '#ef4444',
    marginRight: 8,
  },
  storyText: {
    flex: 1,
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
});
