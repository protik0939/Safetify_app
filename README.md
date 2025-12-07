# Safetify - Community Safety Platform (React Native)

A comprehensive React Native mobile application for community safety and emergency response. This is the mobile implementation of the Safetify platform, originally built with Next.js.

## Features

### 🚨 Emergency SOS
- Hold-to-activate SOS button with progress indicator
- Real-time emergency responder tracking
- Automatic notification to emergency contacts
- Cancel functionality for false alarms

### 🗺️ Safety Map
- Interactive map with React Native Maps
- Real-time location tracking with Expo Location
- Danger zone visualization with severity indicators
- Circular danger zone overlays with customizable radius
- User location marker

### 📊 Safety Analytics
- Risk score tracking
- Incident heatmap visualization
- Historical SOS request tracking
- Safety statistics and trends

### 📱 Core Screens
- **Dashboard**: Map view with danger zones and SOS button
- **History**: View past SOS requests and emergency events
- **Incidents**: Browse detailed incident reports with stories
- **Profile**: Manage account settings and emergency contacts

### 🔐 Authentication
- Email/password login and signup
- Persistent session with AsyncStorage
- Protected routes with Expo Router
- Demo credentials for testing

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router 6.0
- **State Management**: Zustand 5.0 with persistence
- **Maps**: React Native Maps 2.0
- **Location**: Expo Location 18.0
- **TypeScript**: Full type safety
- **Storage**: AsyncStorage for state persistence
- **Notifications**: React Native Toast Message

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

## Installation

1. **Install dependencies**

   ```bash
   cd Safetify_app
   npm install
   ```

2. **Start the development server**

   ```bash
   npx expo start
   ```

3. **Run on your device**

   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## Project Structure

```
Safetify_app/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── index.tsx        # Dashboard with map
│   │   ├── history.tsx      # SOS history
│   │   ├── incidents.tsx    # Incident reports
│   │   └── profile.tsx      # User profile
│   ├── index.tsx            # Splash/loading screen
│   ├── login.tsx            # Login screen
│   ├── signup.tsx           # Signup screen
│   └── _layout.tsx          # Root layout
├── components/              # Reusable components
│   └── SOSButton.tsx        # SOS emergency button
├── store/                   # State management
│   └── useAppStore.ts       # Zustand store
├── types/                   # TypeScript types
│   └── index.ts             # Type definitions
├── utils/                   # Utility functions
│   ├── location.ts          # Location services
│   └── mockData.ts          # Mock data generators
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

## Key Features Implementation

### Location Services
```typescript
// Request and watch user location
import { getCurrentLocation, watchLocation } from './utils/location';

const location = await getCurrentLocation();
const subscription = await watchLocation((newLocation) => {
  // Handle location updates
});
```

### State Management
```typescript
// Global state with Zustand
import { useAppStore } from './store/useAppStore';

const { user, setUser, isAuthenticated } = useAppStore();
```

### SOS Activation
- Hold button for 5 seconds to activate
- Visual progress indicator
- Haptic feedback
- Automatic responder notification

## Configuration

### Location Permissions

The app requests the following permissions:
- `ACCESS_FINE_LOCATION` - For precise location tracking
- `ACCESS_COARSE_LOCATION` - For approximate location
- `ACCESS_BACKGROUND_LOCATION` - For background tracking

### Maps Configuration

Using React Native Maps with default provider. No API key required for basic functionality.

## Demo Credentials

```
Email: demo@safetify.com
Password: demo123
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint

## Environment Variables

No environment variables required for development. All features use mock data.

## Building for Production

### Android
```bash
npx expo build:android
```

### iOS
```bash
npx expo build:ios
```

## Differences from Next.js Version

| Feature | Next.js | React Native |
|---------|---------|--------------|
| Maps | Leaflet | React Native Maps |
| Navigation | Next.js Router | Expo Router |
| Storage | localStorage | AsyncStorage |
| Notifications | react-hot-toast | react-native-toast-message |
| Location | Browser API | Expo Location |
| Styling | Tailwind CSS | StyleSheet |

## Future Enhancements

- [ ] Push notifications
- [ ] Real-time chat with responders
- [ ] Offline mode support
- [ ] Social sharing
- [ ] Multi-language support
- [ ] Voice-activated SOS
- [ ] Integration with emergency services API

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

---

**Note**: This app uses mock data for demonstration purposes. In production, integrate with real backend APIs for authentication, location services, and emergency response coordination.