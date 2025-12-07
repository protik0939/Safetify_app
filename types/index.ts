export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  location: Location;
  createdAt: Date;
  emergencyContacts: string[];
  avatar?: string;
  riskScore: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
  accuracy?: number;
}

export interface DangerZone {
  id: string;
  center: Location;
  radius: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  count: number;
  lastUpdated: Date;
}

export interface SOSRequest {
  id: string;
  userId: string;
  location: Location;
  status: 'active' | 'resolved' | 'cancelled';
  respondents: SOSResponder[];
  createdAt: Date;
  resolvedAt?: Date;
  description?: string;
}

export interface SOSResponder {
  userId: string;
  userName: string;
  location: Location;
  distance: number;
  status: 'coming' | 'arrived' | 'helping' | 'departed';
  joinedAt: Date;
}

export interface RouteAlternative {
  id: string;
  waypoints: Location[];
  distance: number;
  duration: number;
  safety: number;
  timeOfDay: string;
}

export interface IncidentReport {
  id: string;
  sosRequestId: string;
  reporterId: string;
  description: string;
  mediaUrl?: string[];
  createdAt: Date;
  helpful: number;
}

export interface SafetyEvent {
  id: string;
  type: 'sos' | 'incident' | 'help_offered' | 'resolved';
  userId: string;
  location: Location;
  description: string;
  createdAt: Date;
  responders?: SOSResponder[];
  reports?: IncidentReport[];
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PushNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'sos' | 'danger' | 'help_request' | 'route_suggestion';
  data: { [key: string]: any };
  read: boolean;
  createdAt: Date;
}

export interface HeatmapData {
  location: Location;
  intensity: number;
}

export interface IncidentDetail {
  id: string;
  location: Location;
  title: string;
  description: string;
  date: Date;
  severity: string;
  victim: string;
  attackers: string;
  deathToll: number;
  injuryCount: number;
  peopleHelped: number;
  stories: string[];
}
