import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppColors, lastSectionStyle } from "@/constants/theme";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
    cancelAllNotifications,
    clearBadge,
    sendCheckInReminder,
    sendDangerZoneWarning,
    sendEmergencyContactAlert,
    sendSOSAlert,
    sendSOSResolvedNotification,
} from "@/utils/notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    TextInput,
    ActivityIndicator,
    Pressable,
    Animated,
} from "react-native";
import { Image } from "expo-image";
import Toast from "react-native-toast-message";
import { useAppStore } from "../../store/useAppStore";
import { clearSessionToken, getUser, updateUser } from "../../utils/authApi";
import { getCurrentLocation, getReverseGeocode } from "../../utils/location";
import { uploadImageToImgbb } from "../../utils/imageUpload";
import * as ImagePicker from 'expo-image-picker';

const BLOOD_GROUPS = [
  "A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE",
  "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"
];

const GENDERS = ["Male", "Female", "Others"];

const formatBloodGroup = (bg?: string) => {
  if (!bg) return "Unknown";
  return bg.replace("_POSITIVE", "+").replace("_NEGATIVE", "-");
};

const Skeleton = ({ width, height, style, borderRadius = 4 }: { width: number | string, height: number | string, style?: any, borderRadius?: number }) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: AppColors.border,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// ─── Small helper to show a toast after triggering a test notification ────────
function notifySuccess(label: string) {
  Toast.show({ type: "success", text1: "Notification Sent", text2: label });
}
function notifyInfo(label: string) {
  Toast.show({ type: "info", text1: "Scheduled", text2: label });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAppStore();

  // Push notification state from our hook (token, permission, last notification)
  const { expoPushToken, permissionGranted, error, notification } =
    usePushNotifications();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [isBloodGroupOpen, setIsBloodGroupOpen] = useState(false);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLocationUpdating, setIsLocationUpdating] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    const fetchLocationName = async () => {
      if (user?.location && typeof user.location === "string") {
        const [latStr, lngStr] = user.location.split(",");
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (!isNaN(lat) && !isNaN(lng)) {
          const name = await getReverseGeocode(lat, lng);
          if (name) {
            setLocationName(name);
          }
        }
      }
    };
    fetchLocationName();
  }, [user?.location]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchAndUpdateProfile = async () => {
        if (!user) return;
        
        setIsLoadingProfile(true);
        try {
          // 1. Fetch latest user info from backend first
          const latestUserRes = await getUser(user.id);
          let userData = user;
          
          if (isActive && latestUserRes) {
            const rawUser = latestUserRes.user || latestUserRes.data || latestUserRes;
            userData = { ...rawUser };
            setUser(userData);
          }

          // 2. Get current geolocation
          setIsLocationUpdating(true);
          const location = await getCurrentLocation();
          
          if (location) {
            const newLat = location.coords.latitude;
            const newLng = location.coords.longitude;
            
            const backendLoc = userData?.location;
            
            let shouldUpdate = false;
            const locationString = `${newLat},${newLng}`;
            
            if (!backendLoc || backendLoc !== locationString) {
              shouldUpdate = true;
            }

            if (shouldUpdate) {
              console.log("Location missing or changed, updating backend:", locationString);
              const updatedUserRes = await updateUser(user.id, { 
                location: locationString
              });
              
              if (isActive && updatedUserRes) {
                const rawUpdated = updatedUserRes.user || updatedUserRes.data || updatedUserRes;
                const updatedData = { ...rawUpdated };
                setUser(updatedData);
              }
            }
          }
        } catch (err) {
          console.error("Error updating profile on visit:", err);
        } finally {
          if (isActive) {
            setIsLocationUpdating(false);
            setIsLoadingProfile(false);
          }
        }
      };

      fetchAndUpdateProfile();

      return () => {
        isActive = false;
      };
    }, [user?.id])
  );

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditImage(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      let imageUrl = user.image || null;
      if (editImage && !editImage.startsWith("http")) {
        const uploadedUrl = await uploadImageToImgbb(editImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          Toast.show({ type: "error", text1: "Failed to upload image" });
          setIsUpdating(false);
          return;
        }
      }

      const payload: any = { 
        name: editName, 
        address: editAddress,
        bio: editBio,
        image: imageUrl
      };
      
      if (editPhone) payload.contactNo = editPhone;
      if (editBloodGroup) payload.bloodGroup = editBloodGroup;
      if (editGender) payload.gender = editGender;

      const updatedUserRes = await updateUser(user.id, payload);
      const rawUpdated = updatedUserRes.user || updatedUserRes.data || updatedUserRes;
      const userData = { ...rawUpdated };
      setUser(userData);
      setIsEditModalVisible(false);
      Toast.show({ type: "success", text1: "Profile Updated" });
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to update profile" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    await clearSessionToken();
    logout();
    Toast.show({
      type: "success",
      text1: "Success",
      text2: "Logged out successfully",
    });
    router.replace("/login");
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
                {isLoadingProfile && !user.image ? (
                  <Skeleton width={80} height={80} borderRadius={40} />
                ) : user.image ? (
                  <Image source={{ uri: user.image }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              {isLoadingProfile && !user.name ? (
                <Skeleton width={150} height={28} borderRadius={8} style={{ marginBottom: 4 }} />
              ) : (
                <Text style={styles.userName}>{user.name}</Text>
              )}
              {isLoadingProfile && !user.gender ? (
                <Skeleton width={80} height={16} borderRadius={4} style={{ marginVertical: 4 }} />
              ) : user.gender ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                  <Ionicons name={user.gender === 'Male' ? 'male' : user.gender === 'Female' ? 'female' : 'male-female'} size={14} color={user.gender === 'Male' ? "" : user.gender === 'Female' ? "#ff00eaff" : "#001affff"} />
                  <Text style={{ fontSize: 14, color: user.gender === 'Male' ? "" : user.gender === 'Female' ? "#ff00eaff" : "#001affff", marginLeft: 2 }}>{user.gender}</Text>
                </View>
              ) : null}
              {isLoadingProfile && !user.email ? (
                <Skeleton width={200} height={16} borderRadius={4} style={{ marginBottom: 20 }} />
              ) : (
                <Text style={styles.userEmail}>{user.email}</Text>
              )}
              {isLoadingProfile && !user.bio ? (
                <Skeleton width={250} height={40} borderRadius={4} style={{ marginTop: 8 }} />
              ) : user.bio ? (
                <Text style={styles.userBio}>{user.bio}</Text>
              ) : null}

              {isLoadingProfile && !user.name ? (
                <Skeleton width={120} height={32} borderRadius={20} style={{ marginTop: 8, marginBottom: 16 }} />
              ) : (
                <TouchableOpacity 
                  style={styles.editProfileBtn} 
                  onPress={() => {
                    setEditName(user.name);
                    setEditPhone(user.contactNo || "");
                    setEditAddress(user.address || "");
                    setEditBio(user.bio || "");
                    setEditBloodGroup(user.bloodGroup || "");
                    setEditGender(user.gender || "");
                    setEditImage(user.image || null);
                    setIsEditModalVisible(true);
                  }}
                >
                  <Text style={styles.editProfileBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              )}

              <View style={styles.riskScoreContainer}>
                <Text style={styles.riskScoreLabel}>Safety Score</Text>
                {isLoadingProfile && !user.name ? (
                  <Skeleton width={100} height={32} borderRadius={8} style={{ marginBottom: 12 }} />
                ) : (
                  <Text style={styles.riskScoreValue}>{user.riskScore || 0}/100</Text>
                )}
                <View style={styles.riskScoreBar}>
                  <View
                    style={[
                      styles.riskScoreFill,
                      {
                        width: `${user.riskScore || 0}%`,
                        backgroundColor:
                          (user.riskScore || 0) > 70
                            ? "#22c55e"
                            : (user.riskScore || 0) > 40
                              ? "#eab308"
                              : "#f0912b",
                      },
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
                  {isLoadingProfile && !user.contactNo ? (
                    <Skeleton width={120} height={16} borderRadius={4} style={{ marginTop: 4 }} />
                  ) : (
                    <Text style={styles.infoValue}>{user.contactNo}</Text>
                  )}
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="water" size={20} color="#ef4444" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Blood Group</Text>
                  {isLoadingProfile && !user.bloodGroup ? (
                    <Skeleton width={80} height={16} borderRadius={4} style={{ marginTop: 4 }} />
                  ) : (
                    <Text style={styles.infoValue}>{formatBloodGroup(user.bloodGroup)}</Text>
                  )}
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="home" size={20} color="#94a3b8" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Address</Text>
                  {isLoadingProfile && !user.address ? (
                    <Skeleton width={180} height={16} borderRadius={4} style={{ marginTop: 4 }} />
                  ) : (
                    <Text style={styles.infoValue}>{user.address || "Not provided"}</Text>
                  )}
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="location" size={20} color="#94a3b8" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {isLoadingProfile && !user.location ? (
                      <Skeleton width={200} height={32} borderRadius={4} style={{ marginTop: 4 }} />
                    ) : (
                      <Text style={styles.infoValue}>
                        {user.location && typeof user.location === 'string' ? 
                          `${user.location.split(',').map(n => parseFloat(n).toFixed(4)).join(', ')}\n${locationName ? `${locationName}` : ''}` 
                          : "Unknown"}
                      </Text>
                    )}
                    {isLocationUpdating && !isLoadingProfile && <ActivityIndicator size="small" color={AppColors.themeColor} />}
                  </View>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="calendar" size={20} color="#94a3b8" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  {isLoadingProfile && !user.createdAt ? (
                    <Skeleton width={100} height={16} borderRadius={4} style={{ marginTop: 4 }} />
                  ) : (
                    <Text style={styles.infoValue}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
              {isLoadingProfile && (!user.emergencyContacts || user.emergencyContacts.length === 0) ? (
                <>
                  <View style={styles.contactItem}>
                    <Ionicons name="people" size={20} color="#94a3b8" />
                    <Skeleton width={150} height={16} borderRadius={4} style={{ marginLeft: 16 }} />
                  </View>
                  <View style={styles.contactItem}>
                    <Ionicons name="people" size={20} color="#94a3b8" />
                    <Skeleton width={150} height={16} borderRadius={4} style={{ marginLeft: 16 }} />
                  </View>
                </>
              ) : (
                (user.emergencyContacts || []).map((contact, index) => (
                  <View key={index} style={styles.contactItem}>
                    <Ionicons name="people" size={20} color="#94a3b8" />
                    <Text style={styles.contactText}>{contact}</Text>
                  </View>
                ))
              )}
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
                    name={
                      permissionGranted ? "checkmark-circle" : "close-circle"
                    }
                    size={18}
                    color={permissionGranted ? "#22c55e" : "#f0912b"}
                  />
                  <Text style={styles.notifStatusLabel}>Permission</Text>
                  <Text
                    style={[
                      styles.notifStatusValue,
                      { color: permissionGranted ? "#22c55e" : "#f0912b" },
                    ]}
                  >
                    {permissionGranted ? "Granted" : "Denied"}
                  </Text>
                </View>

                {/* Token row */}
                <View style={styles.notifStatusRow}>
                  <Ionicons name="key" size={18} color="#94a3b8" />
                  <Text style={styles.notifStatusLabel}>Push Token</Text>
                  <Text
                    style={styles.notifTokenValue}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {expoPushToken ?? "Not available (use real device)"}
                  </Text>
                </View>

                {/* Error row (only rendered if there's an error) */}
                {error && (
                  <View style={styles.notifStatusRow}>
                    <Ionicons name="warning" size={18} color="#f59e0b" />
                    <Text
                      style={[styles.notifStatusLabel, { color: "#f59e0b" }]}
                    >
                      {error}
                    </Text>
                  </View>
                )}

                {/* Last received notification */}
                {notification && (
                  <View
                    style={[
                      styles.notifStatusRow,
                      {
                        marginTop: 8,
                        flexDirection: "column",
                        alignItems: "flex-start",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.notifStatusLabel, { marginBottom: 4 }]}
                    >
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
                <Text style={styles.notifInfoTitle}>
                  How Push Notifications Work
                </Text>
                <Text style={styles.notifInfoText}>
                  {"1. App requests permission from the OS.\n"}
                  {"2. OS returns a push token (device identifier).\n"}
                  {"3. Token is sent to your backend server.\n"}
                  {"4. Server calls Expo Push API with token + message.\n"}
                  {"5. Expo relays it through FCM (Android) / APNs (iOS).\n"}
                  {"6. Device wakes up and shows the notification.\n\n"}
                  {
                    "Local (test) notifications skip steps 3–5 and fire directly."
                  }
                </Text>
              </View>

              {/* ── Test buttons ─────────────────────────────────────────── */}
              <Text style={styles.notifTestTitle}>
                Fire a Test Notification
              </Text>

              <TouchableOpacity
                style={styles.notifButton}
                onPress={async () => {
                  await sendSOSAlert("Alex Johnson", "Central Park, NY");
                  notifySuccess("SOS Alert fired immediately");
                }}
              >
                <Ionicons name="alert-circle" size={20} color="#f0912b" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>
                    SOS Alert (immediate)
                  </Text>
                  <Text style={styles.notifBtnDesc}>
                    Simulates a nearby SOS received from another user
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notifButton}
                onPress={async () => {
                  await sendDangerZoneWarning("Downtown District", "high");
                  notifySuccess("Danger Zone warning fired");
                }}
              >
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>
                    Danger Zone Warning (immediate)
                  </Text>
                  <Text style={styles.notifBtnDesc}>
                    Simulates entering a high-risk area
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notifButton}
                onPress={async () => {
                  await sendEmergencyContactAlert("Sarah (Emergency Contact)");
                  notifySuccess("Emergency contact alert fired");
                }}
              >
                <Ionicons name="people" size={20} color="#3b82f6" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>
                    Emergency Contact Alert (immediate)
                  </Text>
                  <Text style={styles.notifBtnDesc}>
                    Simulates your contact triggering an SOS
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notifButton}
                onPress={async () => {
                  await sendSOSResolvedNotification();
                  notifySuccess("SOS Resolved notification fired");
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>
                    SOS Resolved (immediate)
                  </Text>
                  <Text style={styles.notifBtnDesc}>
                    Simulates your SOS being marked resolved
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.notifButton, { borderColor: "#8b5cf6" }]}
                onPress={async () => {
                  await sendCheckInReminder(10);
                  notifyInfo(
                    "Check-In reminder fires in 10 seconds – background the app!",
                  );
                }}
              >
                <Ionicons name="timer" size={20} color="#8b5cf6" />
                <View style={styles.notifBtnText}>
                  <Text style={styles.notifBtnLabel}>
                    Check-In Reminder (10s delay)
                  </Text>
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
                    Toast.show({
                      type: "info",
                      text1: "Cancelled",
                      text2: "All pending notifications cancelled",
                    });
                  }}
                >
                  <Ionicons name="ban" size={16} color="#94a3b8" />
                  <Text style={styles.notifSmallBtnText}>
                    Cancel All Scheduled
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.notifSmallBtn}
                  onPress={async () => {
                    await clearBadge();
                    Toast.show({
                      type: "info",
                      text1: "Badge Cleared",
                      text2: "App icon badge reset to 0",
                    });
                  }}
                >
                  <Ionicons
                    name="notifications-off"
                    size={16}
                    color="#94a3b8"
                  />
                  <Text style={styles.notifSmallBtnText}>Clear Badge</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.section, lastSectionStyle]}>
              <Text style={styles.sectionTitle}>Actions</Text>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="settings" size={20} color={AppColors.foreground} />
                <Text style={styles.actionButtonText}>Privacy & Security</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="help-circle" size={20} color={AppColors.foreground} />
                <Text style={styles.actionButtonText}>Help & Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out" size={20} color={AppColors.themeColor} />
                <Text
                  style={[styles.actionButtonText, styles.logoutButtonText]}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ padding: 20, justifyContent: 'center', flexGrow: 1 }}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Profile</Text>

              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity style={styles.editAvatarContainer} onPress={handlePickImage}>
                  {editImage ? (
                    <Image source={{ uri: editImage }} style={styles.editAvatarImage} />
                  ) : (
                    <View style={styles.editAvatarPlaceholder}>
                      <Ionicons name="camera" size={30} color="#94a3b8" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>Tap to change picture</Text>
              </View>
              
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Blood Group</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setIsBloodGroupOpen(true)}
              >
                <Text style={{ color: editBloodGroup ? AppColors.foreground : "#94a3b8" }}>
                  {editBloodGroup ? formatBloodGroup(editBloodGroup) : "Select blood group"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#94a3b8" style={{ position: 'absolute', right: 12, top: 12 }} />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Gender</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setIsGenderOpen(true)}
              >
                <Text style={{ color: editGender ? AppColors.foreground : "#94a3b8" }}>
                  {editGender ? editGender : "Select gender"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#94a3b8" style={{ position: 'absolute', right: 12, top: 12 }} />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.input}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Enter your address"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell us about yourself"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => setIsEditModalVisible(false)}
                  disabled={isUpdating}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalSaveBtn]}
                  onPress={handleUpdateProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={isBloodGroupOpen} transparent animationType="fade">
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsBloodGroupOpen(false)}
        />
        <View style={styles.bloodGroupModalBox}>
          <Text style={styles.bloodGroupModalTitle}>Select Blood Group</Text>
          {BLOOD_GROUPS.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.bloodGroupOption}
              onPress={() => {
                setEditBloodGroup(item);
                setIsBloodGroupOpen(false);
              }}
            >
              <Text style={[styles.bloodGroupOptionText, { color: editBloodGroup === item ? AppColors.themeColor : AppColors.foreground }]}>
                {editBloodGroup === item && (
                  <Ionicons name="checkmark" size={15} color={AppColors.themeColor} />
                )}
                {editBloodGroup === item ? ' ' : ''}
                {formatBloodGroup(item)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      <Modal visible={isGenderOpen} transparent animationType="fade">
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsGenderOpen(false)}
        />
        <View style={styles.bloodGroupModalBox}>
          <Text style={styles.bloodGroupModalTitle}>Select Gender</Text>
          {GENDERS.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.bloodGroupOption}
              onPress={() => {
                setEditGender(item);
                setIsGenderOpen(false);
              }}
            >
              <Text style={[styles.bloodGroupOptionText, { color: editGender === item ? AppColors.themeColor : AppColors.foreground }]}>
                {editGender === item && (
                  <Ionicons name="checkmark" size={15} color={AppColors.themeColor} />
                )}
                {editGender === item ? ' ' : ''}
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
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
    fontWeight: "bold",
    color: AppColors.foreground,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: AppColors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.themeColor,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: AppColors.foreground,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.foreground,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: AppColors.foreground,
    marginBottom: 20,
  },
  riskScoreContainer: {
    width: "100%",
    alignItems: "center",
  },
  riskScoreLabel: {
    fontSize: 12,
    color: AppColors.foreground,
    marginBottom: 8,
  },
  riskScoreValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: AppColors.foreground,
    marginBottom: 12,
  },
  riskScoreBar: {
    width: "100%",
    height: 8,
    backgroundColor: AppColors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  riskScoreFill: {
    height: "100%",
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.foreground,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  infoText: {
    marginLeft: 16,
    flex: 1,
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
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  contactText: {
    fontSize: 16,
    color: AppColors.foreground,
    marginLeft: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  actionButtonText: {
    fontSize: 16,
    color: AppColors.foreground,
    marginLeft: 16,
  },
  logoutButton: {
    backgroundColor: "transparent",
    borderColor: AppColors.themeColor,
  },
  logoutButtonText: {
    color: AppColors.themeColor,
  },
  editProfileBtn: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: AppColors.themeColor,
  },
  editProfileBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    backgroundColor: AppColors.background,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.foreground,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: AppColors.foreground,
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 8,
    padding: 12,
    color: AppColors.foreground,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalCancelBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  modalCancelBtnText: {
    color: AppColors.foreground,
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: AppColors.themeColor,
  },
  modalSaveBtnText: {
    color: "#ffffff",
    fontWeight: "600",
  },

  // ── Push Notification section ──────────────────────────────────────────────
  notifStatusCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 10,
  },
  notifStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifStatusLabel: {
    fontSize: 13,
    color: AppColors.foreground,
    flex: 1,
  },
  notifStatusValue: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.foreground,
  },
  notifTokenValue: {
    fontSize: 11,
    color: AppColors.foreground,
    flex: 2,
  },
  notifLastTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.foreground,
    marginBottom: 2,
  },
  notifLastBody: {
    fontSize: 12,
    color: AppColors.foreground,
  },
  notifInfoCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  notifInfoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.themeColor,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notifInfoText: {
    fontSize: 12,
    color: AppColors.themeColor,
    lineHeight: 20,
  },
  notifTestTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.foreground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  notifButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 12,
  },
  notifBtnText: {
    flex: 1,
  },
  notifBtnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.foreground,
    marginBottom: 2,
  },
  notifBtnDesc: {
    fontSize: 11,
    color: AppColors.foreground,
  },
  notifActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  notifSmallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.background,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 6,
  },
  notifSmallBtnText: {
    fontSize: 11,
    color: AppColors.foreground,
    textAlign: "center",
  },
  editAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.themeColor,
  },
  editAvatarImage: {
    width: '100%',
    height: '100%',
  },
  editAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bloodGroupModalBox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: AppColors.background,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  bloodGroupModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.foreground,
    marginBottom: 15,
  },
  bloodGroupOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  bloodGroupOptionText: {
    fontSize: 16,
    color: AppColors.foreground,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    borderColor: AppColors.themeColor,
    borderWidth: 2,
  },
  userBio: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
