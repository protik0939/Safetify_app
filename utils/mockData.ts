import { User, DangerZone, SOSRequest, SOSResponder, IncidentReport, IncidentDetail, RouteAlternative } from '../types';

// Mock user data - Dhaka, Bangladesh
export const mockUser: User = {
  id: 'user-123',
  email: 'user@example.com',
  name: 'John Doe',
  phone: '+8801712345678',
  location: { latitude: 23.7808, longitude: 90.4132, timestamp: new Date() }, // Gulshan, Dhaka
  createdAt: new Date('2024-01-15'),
  emergencyContacts: ['mom@example.com', 'brother@example.com'],
  riskScore: 45,
};

// Mock danger zones
export const generateMockDangerZones = (): DangerZone[] => [
  {
    id: 'danger-1',
    center: { latitude: 23.7808, longitude: 90.4132, timestamp: new Date() },
    radius: 0.5,
    severity: 'high',
    type: 'Crime Hotspot',
    count: 15,
    lastUpdated: new Date(Date.now() - 3600000),
  },
  {
    id: 'danger-2',
    center: { latitude: 23.7706, longitude: 90.4094, timestamp: new Date() },
    radius: 0.3,
    severity: 'critical',
    type: 'Accident Prone Area',
    count: 8,
    lastUpdated: new Date(Date.now() - 7200000),
  },
  {
    id: 'danger-3',
    center: { latitude: 23.7906, longitude: 90.4194, timestamp: new Date() },
    radius: 0.4,
    severity: 'medium',
    type: 'Low Light Area',
    count: 5,
    lastUpdated: new Date(Date.now() - 1800000),
  },
  {
    id: 'danger-4',
    center: { latitude: 23.7656, longitude: 90.3998, timestamp: new Date() },
    radius: 0.6,
    severity: 'low',
    type: 'Isolated Road',
    count: 3,
    lastUpdated: new Date(Date.now() - 5400000),
  },
];

// Mock SOS responders
export const generateMockResponders = (): SOSResponder[] => [
  {
    userId: 'user-124',
    userName: 'Sarah Johnson',
    location: { latitude: 23.7814, longitude: 90.4142, timestamp: new Date() },
    distance: 0.2,
    status: 'coming',
    joinedAt: new Date(Date.now() - 180000),
  },
  {
    userId: 'user-125',
    userName: 'Mike Chen',
    location: { latitude: 23.7812, longitude: 90.4145, timestamp: new Date() },
    distance: 0.35,
    status: 'coming',
    joinedAt: new Date(Date.now() - 120000),
  },
  {
    userId: 'user-126',
    userName: 'Emma Wilson',
    location: { latitude: 23.7816, longitude: 90.4138, timestamp: new Date() },
    distance: 0.45,
    status: 'arrived',
    joinedAt: new Date(Date.now() - 300000),
  },
];

// Mock SOS request
export const generateMockSOSRequest = (): SOSRequest => ({
  id: 'sos-123',
  userId: 'user-123',
  location: { latitude: 23.7808, longitude: 90.4132, timestamp: new Date() },
  status: 'active',
  respondents: generateMockResponders(),
  createdAt: new Date(Date.now() - 600000),
  description: 'Need immediate assistance',
});

// Mock incident reports
export const generateMockIncidentReports = (): IncidentReport[] => [
  {
    id: 'report-1',
    sosRequestId: 'sos-123',
    reporterId: 'user-124',
    description: 'Person appeared disoriented but is now safe. Emergency services notified.',
    createdAt: new Date(Date.now() - 300000),
    helpful: 12,
  },
  {
    id: 'report-2',
    sosRequestId: 'sos-123',
    reporterId: 'user-125',
    description: 'We provided first aid and stayed until ambulance arrived.',
    mediaUrl: ['https://via.placeholder.com/400x300'],
    createdAt: new Date(Date.now() - 180000),
    helpful: 18,
  },
];

// Mock alternative routes
export const generateMockRoutes = (): RouteAlternative[] => [
  {
    id: 'route-1',
    waypoints: [
      { latitude: 23.7808, longitude: 90.4132, timestamp: new Date() },
      { latitude: 23.7850, longitude: 90.4180, timestamp: new Date() },
      { latitude: 23.7900, longitude: 90.4230, timestamp: new Date() },
    ],
    distance: 2.5,
    duration: 8,
    safety: 45,
    timeOfDay: 'evening',
  },
  {
    id: 'route-2',
    waypoints: [
      { latitude: 23.7808, longitude: 90.4132, timestamp: new Date() },
      { latitude: 23.7850, longitude: 90.4100, timestamp: new Date() },
      { latitude: 23.7900, longitude: 90.4150, timestamp: new Date() },
    ],
    distance: 3.2,
    duration: 11,
    safety: 75,
    timeOfDay: 'evening',
  },
  {
    id: 'route-3',
    waypoints: [
      { latitude: 23.7808, longitude: 90.4132, timestamp: new Date() },
      { latitude: 23.7900, longitude: 90.4230, timestamp: new Date() },
    ],
    distance: 1.8,
    duration: 5,
    safety: 55,
    timeOfDay: 'evening',
  },
];

// Enhanced incident data with detailed stories for Dhaka, Bangladesh
export const generateMockIncidentDetails = (): IncidentDetail[] => [
  {
    id: 'incident-1',
    location: { latitude: 23.7808, longitude: 90.4132, timestamp: new Date() },
    title: 'Gulshan Lake Road Mugging',
    description: 'Late night mugging incident reported near Gulshan Lake',
    date: new Date(Date.now() - 86400000),
    severity: 'high',
    victim: 'Young professional returning home',
    attackers: '2 individuals on motorcycle',
    deathToll: 0,
    injuryCount: 1,
    peopleHelped: 3,
    stories: [
      'Victim was walking home around 11 PM when approached by motorcycle riders',
      'Security guards from nearby building responded to screams',
      'Police arrived within 8 minutes and took detailed statements',
    ],
  },
  {
    id: 'incident-2',
    location: { latitude: 23.7806, longitude: 90.4194, timestamp: new Date() },
    title: 'Gulshan-1 Chain Snatching',
    description: 'Multiple chain snatching incidents in the area',
    date: new Date(Date.now() - 172800000),
    severity: 'high',
    victim: 'Female pedestrian',
    attackers: '2 suspects on motorbike',
    deathToll: 0,
    injuryCount: 1,
    peopleHelped: 2,
    stories: [
      'Chain snatched while victim was walking in the evening',
      'Nearby shopkeepers tried to chase the perpetrators',
      'Incident reported to Gulshan Police Station',
    ],
  },
  {
    id: 'incident-3',
    location: { latitude: 23.7556, longitude: 90.3872, timestamp: new Date() },
    title: 'Dhanmondi Lake Area Harassment',
    description: 'Harassment incident near Dhanmondi Lake',
    date: new Date(Date.now() - 259200000),
    severity: 'medium',
    victim: 'Female jogger',
    attackers: 'Group of 3-4 individuals',
    deathToll: 0,
    injuryCount: 0,
    peopleHelped: 5,
    stories: [
      'Victim was harassed while jogging in the evening',
      'Other joggers and local residents intervened',
      'Police patrol increased in the area after incident',
    ],
  },
  {
    id: 'incident-4',
    location: { latitude: 23.7276, longitude: 90.3909, timestamp: new Date() },
    title: 'Mirpur Road Accident',
    description: 'Major traffic accident on Mirpur Road',
    date: new Date(Date.now() - 345600000),
    severity: 'critical',
    victim: 'Bus passengers',
    attackers: 'N/A',
    deathToll: 2,
    injuryCount: 15,
    peopleHelped: 20,
    stories: [
      'Two buses collided during rush hour traffic',
      'Local residents and emergency services responded quickly',
      'Injured were taken to nearby hospitals',
      'Traffic was diverted for several hours',
    ],
  },
];
