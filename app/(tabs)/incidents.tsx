import { AppColors, lastSectionStyle } from '@/constants/theme';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { IncidentDetail } from '../../types';
import { generateMockIncidentDetails } from '../../utils/mockData';

export default function IncidentsScreen() {
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium',
    victim: '',
    attackers: '',
    deathToll: '0',
    injuryCount: '0',
    peopleHelped: '0',
  });

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

  const resetForm = () => {
    setNewIncident({
      title: '',
      description: '',
      severity: 'medium',
      victim: '',
      attackers: '',
      deathToll: '0',
      injuryCount: '0',
      peopleHelped: '0',
    });
  };

  const handleCancelAddIncident = () => {
    resetForm();
    setShowAddForm(false);
  };

  const handleSaveIncident = () => {
    if (!newIncident.title.trim() || !newIncident.description.trim()) {
      Alert.alert('Missing fields', 'Please enter at least a title and description.');
      return;
    }

    const createdIncident: IncidentDetail = {
      id: `user-${Date.now()}`,
      location: {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
      },
      title: newIncident.title.trim(),
      description: newIncident.description.trim(),
      date: new Date(),
      severity: newIncident.severity.trim().toLowerCase() || 'medium',
      victim: newIncident.victim.trim() || 'Unknown',
      attackers: newIncident.attackers.trim() || 'N/A',
      deathToll: Number.parseInt(newIncident.deathToll, 10) || 0,
      injuryCount: Number.parseInt(newIncident.injuryCount, 10) || 0,
      peopleHelped: Number.parseInt(newIncident.peopleHelped, 10) || 0,
      stories: [],
    };

    setIncidents((previous) => [createdIncident, ...previous]);
    resetForm();
    setShowAddForm(false);
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
          <View style={lastSectionStyle}>
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
        <View style={lastSectionStyle}>
          <TouchableOpacity
            style={styles.addIncidentButton}
            onPress={() => setShowAddForm((previous) => !previous)}
          >
            <Text style={styles.addIncidentButtonText}>
              {showAddForm ? 'Close Form' : 'Add Incident'}
            </Text>
          </TouchableOpacity>

          {showAddForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New Incident</Text>

              <TextInput
                style={styles.input}
                value={newIncident.title}
                onChangeText={(value) => setNewIncident((previous) => ({ ...previous, title: value }))}
                placeholder="Title"
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                value={newIncident.description}
                onChangeText={(value) => setNewIncident((previous) => ({ ...previous, description: value }))}
                placeholder="Description"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
              />

              <TextInput
                style={styles.input}
                value={newIncident.severity}
                onChangeText={(value) => setNewIncident((previous) => ({ ...previous, severity: value }))}
                placeholder="Severity (low/medium/high/critical)"
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={styles.input}
                value={newIncident.victim}
                onChangeText={(value) => setNewIncident((previous) => ({ ...previous, victim: value }))}
                placeholder="Victim"
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={styles.input}
                value={newIncident.attackers}
                onChangeText={(value) => setNewIncident((previous) => ({ ...previous, attackers: value }))}
                placeholder="Attackers"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.numberInputsRow}>
                <TextInput
                  style={[styles.input, styles.numberInput]}
                  value={newIncident.deathToll}
                  onChangeText={(value) => setNewIncident((previous) => ({ ...previous, deathToll: value }))}
                  placeholder="Deaths"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
                <TextInput
                  style={[styles.input, styles.numberInput]}
                  value={newIncident.injuryCount}
                  onChangeText={(value) => setNewIncident((previous) => ({ ...previous, injuryCount: value }))}
                  placeholder="Injuries"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
                <TextInput
                  style={[styles.input, styles.numberInput]}
                  value={newIncident.peopleHelped}
                  onChangeText={(value) => setNewIncident((previous) => ({ ...previous, peopleHelped: value }))}
                  placeholder="Helpers"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveIncident}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelAddIncident}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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

        </View>
      </ScrollView>
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
    color: AppColors.foreground,
  },
  backButton: {
    fontSize: 16,
    color: AppColors.themeColor,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addIncidentButton: {
    backgroundColor: AppColors.themeColor,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  addIncidentButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  formCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.foreground,
    marginBottom: 12,
  },
  input: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    color: AppColors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  numberInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numberInput: {
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: '#f0912b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  incidentCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
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
    color: AppColors.foreground,
    marginBottom: 4,
  },
  incidentDate: {
    fontSize: 12,
    color: AppColors.foreground,
    marginBottom: 8,
  },
  incidentDescription: {
    fontSize: 14,
    color: AppColors.foreground,
    marginBottom: 12,
  },
  incidentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  incidentStat: {
    fontSize: 14,
    color: AppColors.foreground,
  },
  detailCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.foreground,
    marginBottom: 8,
  },
  detailDate: {
    fontSize: 14,
    color: AppColors.foreground,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: 16,
  },
  detailDescription: {
    fontSize: 16,
    color: AppColors.foreground,
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
    color: AppColors.themeColor,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: AppColors.foreground,
  },
  infoSection: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: AppColors.foreground,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: AppColors.foreground,
  },
  storiesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.foreground,
    marginBottom: 16,
  },
  storyItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  storyBullet: {
    fontSize: 16,
    color: AppColors.themeColor,
    marginRight: 8,
  },
  storyText: {
    flex: 1,
    fontSize: 14,
    color: AppColors.foreground,
    lineHeight: 20,
  },
});
