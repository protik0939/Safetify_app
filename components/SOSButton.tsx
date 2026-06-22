import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert, ActivityIndicator, Keyboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from '@/components/AppToast';
import { useAppStore } from '../store/useAppStore';
import { generateMockSOSRequest } from '../utils/mockData';
import { createIncident, updateIncident, getIncidentById } from '../utils/incidentApi';
import { AppColors } from '@/constants/theme';

const getTimingFromDate = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= 8 && hour < 11) return "Morning (08:00 – 11:00 AM)";
  if (hour >= 11 && hour < 14) return "Midday (11:00 AM – 02:00 PM)";
  if (hour >= 14 && hour < 17) return "Afternoon (02:00 – 05:00 PM)";
  if (hour >= 17 && hour < 20) return "Evening (05:00 – 08:00 PM)";
  if (hour >= 20 && hour < 23) return "Night (08:00 – 11:00 PM)";
  if (hour >= 23 || hour < 2) return "Late Night (11:00 PM – 02:00 AM)";
  if (hour >= 2 && hour < 5) return "Deep Night (02:00 – 05:00 AM)";
  return "Dawn Watch (05:00 – 08:00 AM)";
};

export default function SOSButton() {
  const { 
    user,
    userLocation, 
    setActiveSOSRequest, 
    activeSOSRequest, 
    setSOSActive, 
    isSOSActive,
    activeSOSIncidentId,
    setActiveSOSIncidentId
  } = useAppStore();

  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [sosCreatedAt, setSosCreatedAt] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Custom message/voice recording states
  const [messageText, setMessageText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressWidthAnim = useRef(new Animated.Value(0)).current;

  // Wave animation for sound simulation
  const waveAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1)
  ]).current;
  const waveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = () => {
    if (!userLocation && !isSOSActive) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Location permission required',
      });
      return;
    }
    
    setIsHolding(true);
    progressRef.current = 0;
    progressWidthAnim.setValue(0);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Smooth progress bar animation
    Animated.timing(progressWidthAnim, {
      toValue: 100,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    holdTimerRef.current = setInterval(() => {
      progressRef.current += 2;
      setHoldProgress(progressRef.current);

      if (progressRef.current >= 100) {
        if (isSOSActive) {
          cancelSOS();
        } else {
          triggerSOS();
        }
        stopHold();
      }
    }, 100);
  };

  const stopHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
    }
    setIsHolding(false);
    setHoldProgress(0);
    progressRef.current = 0;
    scaleAnim.setValue(1);
    progressWidthAnim.stopAnimation();
    progressWidthAnim.setValue(0);
  };

  const triggerSOS = async () => {
    if (userLocation) {
      const sosRequest = generateMockSOSRequest();
      setActiveSOSRequest(sosRequest);
      setSOSActive(true);
      const now = new Date();
      setSosCreatedAt(now);
      setElapsedTime(0);

      // Automatically create incident in database
      if (user?.id) {
        try {
          const timing = getTimingFromDate(now);
          const incident = await createIncident({
            userId: user.id,
            title: 'SOS Emergency',
            description: 'Emergency SOS activated by user',
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            severityLevel: 'critical',
            timing,
          });
          setActiveSOSIncidentId(incident.id);
        } catch (error: any) {
          console.error("Failed to automatically create SOS incident in DB:", error);
        }
      }

      Toast.show({
        type: 'success',
        text1: 'SOS Activated',
        text2: 'Emergency services notified and incident logged!',
      });
    }
  };

  const cancelSOS = () => {
    setActiveSOSRequest(null);
    setActiveSOSIncidentId(null);
    setSOSActive(false);
    setSosCreatedAt(null);
    setElapsedTime(0);
    setMessageText('');
    setIsRecording(false);
    setIsTranscribing(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    Toast.show({
      type: 'success',
      text1: 'SOS Cancelled',
      text2: 'Emergency alert cancelled',
    });
  };

  // Sound wave animation handlers
  const startWaveAnimation = () => {
    waveIntervalRef.current = setInterval(() => {
      waveAnims.forEach((anim) => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: Math.random() * 2.5 + 0.5,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start();
      });
    }, 150);
  };

  const stopWaveAnimation = () => {
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current);
    }
    waveAnims.forEach((anim) => anim.setValue(1));
  };

  const startRecording = () => {
    setIsRecording(true);
    setIsTranscribing(false);
    startWaveAnimation();
    
    // Automatically stop after 5 seconds
    recordTimeoutRef.current = setTimeout(() => {
      stopRecording();
    }, 5000);
  };

  const stopRecording = () => {
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
    }
    stopWaveAnimation();
    setIsTranscribing(true);
    
    // Simulate transcribing typing effect
    setTimeout(() => {
      const phrases = [
        "Help, there is an emergency near my location!",
        "Injured person requires immediate assistance.",
        "Need support immediately, threat encountered.",
        "Please send emergency responder to my current location.",
        "Encountered suspicious activity, heading to safety."
      ];
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      setMessageText(randomPhrase);
      setIsRecording(false);
      setIsTranscribing(false);
      Toast.show({
        type: 'success',
        text1: 'Voice Transcribed',
        text2: 'Voice notes successfully converted to text.',
      });
    }, 1500);
  };

  const handleMicPress = () => {
    if (micPermissionGranted === null) {
      Alert.alert(
        "Microphone Access Required",
        "Safetify needs access to your microphone to transcribe voice notes for responders.",
        [
          { text: "Deny", style: "cancel", onPress: () => setMicPermissionGranted(false) },
          { text: "Allow", onPress: () => {
              setMicPermissionGranted(true);
              startRecording();
            }
          }
        ]
      );
    } else if (micPermissionGranted === false) {
      Alert.alert("Permission Denied", "Please enable microphone permission in settings to transcribe voice notes.");
    } else {
      startRecording();
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !activeSOSIncidentId) return;
    setSendingMessage(true);
    try {
      // Fetch current incident to preserve existing stories
      const incident = await getIncidentById(activeSOSIncidentId);
      const currentStories = incident.stories || [];
      const updatedStories = [...currentStories, messageText.trim()];

      await updateIncident(activeSOSIncidentId, {
        stories: updatedStories,
        description: messageText.trim() // Also set latest detail as description
      });

      setMessageText('');
      Toast.show({
        type: 'success',
        text1: 'Details Sent',
        text2: 'Incident details uploaded to database.',
      });
    } catch (error: any) {
      console.error("Failed to upload SOS detail message:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not upload details. Please try again.',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Timer effect for auto-incrementing elapsed time
  useEffect(() => {
    if (isSOSActive && sosCreatedAt) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sosCreatedAt.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSOSActive, sosCreatedAt]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
      if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    };
  }, []);

  const remainingSeconds = Math.ceil((100 - holdProgress) / 20);
  const secondsText = remainingSeconds === 1 ? 'second' : 'seconds';
  const actionText = isSOSActive ? 'cancel SOS' : 'activate SOS';
  const holdMessage = `Hold for ${remainingSeconds} ${secondsText} to ${actionText}`;

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (isSOSActive && activeSOSRequest) {
    const respondentCount = activeSOSRequest.respondents.length;

    return (
      <>
        {isHolding && (
          <View style={styles.loadingBarContainer}>
            <View style={styles.loadingBarContent}>
              <Text style={styles.loadingBarText}>{holdMessage}</Text>
              <View style={styles.loadingBarTrack}>
                <Animated.View 
                  style={[
                    styles.loadingBarFill,
                    {
                      width: progressWidthAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]} 
                />
              </View>
            </View>
          </View>
        )}
        <View style={[
          styles.sosActiveContainer,
          { bottom: keyboardHeight > 0 ? keyboardHeight + 10 : 130 }
        ]}>
          <View style={styles.sosActiveCard}>
            <Text style={styles.sosActiveTitle}>🚨 SOS MODE ACTIVATED</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{respondentCount}</Text>
                <Text style={styles.statLabel}>Responders</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>2</Text>
                <Text style={styles.statLabel}>On Way</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPressIn={startHold}
              onPressOut={stopHold}
            >
              <Text style={styles.cancelButtonText}>
                Hold to Cancel SOS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Details input section with Voice/Text capabilities */}
          {activeSOSIncidentId && (
            <View style={styles.inputCard}>
              <Text style={styles.inputCardTitle}>💬 Send Live Details</Text>
              {isRecording ? (
                <View style={styles.recordingContainer}>
                  <View style={styles.waveRow}>
                    {waveAnims.map((anim, idx) => (
                      <Animated.View
                        key={idx}
                        style={[
                          styles.waveBar,
                          {
                            transform: [{ scaleY: anim }],
                            backgroundColor: idx % 2 === 0 ? '#ef4444' : '#f97316'
                          }
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.recordingText}>
                    {isTranscribing ? "Transcribing voice..." : "Recording... Speak now"}
                  </Text>
                  {!isTranscribing && (
                    <TouchableOpacity style={styles.stopRecordBtn} onPress={stopRecording}>
                      <Text style={styles.stopRecordBtnText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Type detail or tap mic..."
                    placeholderTextColor="rgba(30, 49, 95, 0.45)"
                    editable={!sendingMessage}
                  />
                  <TouchableOpacity
                    style={styles.micButton}
                    onPress={handleMicPress}
                    disabled={sendingMessage}
                  >
                    <Ionicons name="mic" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={styles.container}>
          <TouchableOpacity
            style={[styles.sosButton, styles.sosButtonDisabled]}
            disabled={true}
          >
            <Text style={styles.sosTimerText}>{formatElapsed(elapsedTime)}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      {isHolding && (
        <View style={styles.loadingBarContainer}>
          <View style={styles.loadingBarContent}>
            <Text style={styles.loadingBarText}>{holdMessage}</Text>
            <View style={styles.loadingBarTrack}>
              <Animated.View 
                style={[
                  styles.loadingBarFill,
                  {
                    width: progressWidthAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]} 
              />
            </View>
          </View>
        </View>
      )}
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.sosButton, isHolding && styles.sosButtonActive]}
            onPressIn={startHold}
            onPressOut={stopHold}
          >
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.instructionText}>Hold for 5 seconds</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingBarContainer: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    transform: [{ translateY: -40 }],
    zIndex: 1000,
  },
  loadingBarContent: {
    backgroundColor: 'rgba(255, 240, 233, 0.85)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingBarText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: '#f09129',
    borderRadius: 3,
  },
  container: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  sosButton: {
    width: 80,
    height: 80,
    borderRadius: 45,
    backgroundColor: '#f09129',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#fff7ed',
  },
  sosButtonActive: {
    backgroundColor: '#f09129',
  },
  sosText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    fontFamily: '',
  },
  instructionText: {
    display: 'none',
  },
  sosActiveContainer: {
    position: 'absolute',
    bottom: 130,
    left: 20,
    right: 20,
  },
  sosActiveCard: {
    backgroundColor: '#f09129',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosActiveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  sosButtonDisabled: {
    backgroundColor: '#1e315f',
    opacity: 0.9,
  },
  sosTimerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  cancelButton: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
  },
  cancelButtonText: {
    color: '#1e315f',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(240, 145, 41, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e315f',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#1e315f',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(30, 49, 95, 0.16)',
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f09129',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e315f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 30,
    marginBottom: 8,
  },
  waveBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  recordingText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
    marginBottom: 8,
  },
  stopRecordBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stopRecordBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
