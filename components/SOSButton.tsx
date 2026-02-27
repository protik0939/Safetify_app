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
  const [elapsedTime, setElapsedTime] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressWidthAnim = useRef(new Animated.Value(0)).current;

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

  const triggerSOS = () => {
    if (userLocation) {
      const sosRequest = generateMockSOSRequest();
      setActiveSOSRequest(sosRequest);
      setSOSActive(true);
      const now = new Date();
      setSosCreatedAt(now);
      setElapsedTime(0);
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
    setElapsedTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    Toast.show({
      type: 'success',
      text1: 'SOS Cancelled',
      text2: 'Emergency alert cancelled',
    });
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
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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
        <View style={styles.sosActiveContainer}>
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
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  loadingBarContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingBarText: {
    color: '#fff',
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
    backgroundColor: '#ef4444',
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
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  sosButtonActive: {
    backgroundColor: '#dc2626',
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
  sosButtonDisabled: {
    backgroundColor: '#7f1d1d',
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
