import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAppStore } from '../store/useAppStore';
import { generateMockSOSRequest } from '../utils/mockData';

export default function SOSButton() {
  const { userLocation, setActiveSOSRequest, activeSOSRequest, setSOSActive, isSOSActive } = useAppStore();
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [sosCreatedAt, setSosCreatedAt] = useState<Date | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
  };

  const triggerSOS = () => {
    if (userLocation) {
      const sosRequest = generateMockSOSRequest();
      setActiveSOSRequest(sosRequest);
      setSOSActive(true);
      setSosCreatedAt(new Date());
      Toast.show({
        type: 'success',
        text1: 'SOS Activated',
        text2: 'Emergency services notified!',
      });
    }
  };

  const cancelSOS = () => {
    setActiveSOSRequest(null);
    setSOSActive(false);
    setSosCreatedAt(null);
    Toast.show({
      type: 'success',
      text1: 'SOS Cancelled',
      text2: 'Emergency alert cancelled',
    });
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  if (isSOSActive && activeSOSRequest) {
    const timeElapsed = sosCreatedAt ? Math.floor((Date.now() - sosCreatedAt.getTime()) / 1000) : 0;
    const respondentCount = activeSOSRequest.respondents.length;

    return (
      <View style={styles.sosActiveContainer}>
        <View style={styles.sosActiveCard}>
          <Text style={styles.sosActiveTitle}>🚨 SOS MODE ACTIVATED</Text>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{timeElapsed}s</Text>
          </View>
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
              {isHolding ? `Hold to Cancel (${holdProgress}%)` : 'Hold to Cancel SOS'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.sosButton, isHolding && styles.sosButtonActive]}
          onPressIn={startHold}
          onPressOut={stopHold}
        >
          <Text style={styles.sosText}>SOS</Text>
          {isHolding && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${holdProgress}%` }]} />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
      <Text style={styles.instructionText}>Hold for 5 seconds</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonActive: {
    backgroundColor: '#dc2626',
  },
  sosText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
  instructionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sosActiveContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
  },
  sosActiveCard: {
    backgroundColor: '#dc2626',
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
  timerContainer: {
    backgroundColor: '#b91c1c',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
