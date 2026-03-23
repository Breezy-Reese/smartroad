import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartroad';

/* ============================================================
   SCHEMAS
============================================================ */
const ResponderSubSchema = new mongoose.Schema({
  responderId: mongoose.Schema.Types.ObjectId,
  name: String,
  type: String,
  hospital: String,
  eta: Number,
  distance: Number,
  status: String,
  location: { lat: Number, lng: Number },
  dispatchedAt: Date,
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: { type: String, select: false },
  role: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true },
  licenseNumber: String,
  vehicleNumber: String,
  hospitalName: String,
  registrationNumber: String,
  address: String,
  location: { lat: Number, lng: Number },
  contactNumber: String,
  responderType: String,
  hospitalId: mongoose.Schema.Types.ObjectId,
  currentLocation: { lat: Number, lng: Number },
  certifications: [String],
  experience: Number,
  emergencyContacts: [{
    name: String, relationship: String, phone: String,
    email: String, isPrimary: Boolean, isNotified: { type: Boolean, default: false }
  }],
  medicalInfo: {
    bloodGroup: String, allergies: [String],
    medicalConditions: [String], medications: [String]
  },
}, { timestamps: true });

const IncidentSchema = new mongoose.Schema({
  incidentId: { type: String, unique: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeedUser' },
  driverName: String,
  driverPhone: String,
  type: String,
  severity: String,
  status: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number],
  },
  locationAddress: String,
  timestamp: Date,
  detectedAt: Date,
  confirmedAt: Date,
  resolvedAt: Date,
  speed: Number,
  impactForce: Number,
  airbagDeployed: Boolean,
  occupants: Number,
  injuries: Number,
  fatalities: Number,
  vehicleNumber: String,
  vehicleMake: String,
  vehicleModel: String,
  vehicleColor: String,
  responders: [ResponderSubSchema],
  emergencyContacts: [{
    name: String, relationship: String, phone: String, isNotified: Boolean
  }],
  hospitalId: mongoose.Schema.Types.ObjectId,
  assignedAmbulance: String,
  assignedHospital: String,
}, { timestamps: true });

IncidentSchema.index({ location: '2dsphere' });

// ── Audit Log Schema (matches your AuditLog.model.ts)
const AuditLogSchema = new mongoose.Schema({
  actorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: String,
  actorRole: String,
  action:    String,
  target:    String,
  targetId:  String,
  ipAddress: String,
  userAgent: String,
  metadata:  mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const User     = mongoose.model('User',     UserSchema);
const Incident = mongoose.model('Incident', IncidentSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

/* ============================================================
   HELPERS
============================================================ */
const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const nairobiLocations = [
  { lat: -1.2921, lng: 36.8219, address: 'CBD, Nairobi' },
  { lat: -1.3031, lng: 36.7073, address: 'Westlands, Nairobi' },
  { lat: -1.2833, lng: 36.8167, address: 'Upper Hill, Nairobi' },
  { lat: -1.3192, lng: 36.8800, address: 'South B, Nairobi' },
  { lat: -1.2636, lng: 36.8030, address: 'Parklands, Nairobi' },
  { lat: -1.2408, lng: 36.8800, address: 'Kasarani, Nairobi' },
  { lat: -1.3170, lng: 36.7870, address: 'Ngong Road, Nairobi' },
  { lat: -1.2990, lng: 36.8360, address: 'Kilimani, Nairobi' },
];

/* ============================================================
   SEED
============================================================ */
async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Incident.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('✅ Cleared existing data\n');

    const password = await hashPassword('Password123!');

    /* ===== ADMIN ===== */
    console.log('👤 Seeding Admin...');
    const admin = await User.create({
      name: 'System Admin', email: 'admin@smartroad.com',
      password, role: 'admin', phone: '+254700000001',
    });
    console.log('  ✅ admin@smartroad.com / Password123!\n');

    /* ===== HOSPITALS ===== */
    console.log('🏥 Seeding Hospitals...');
    const hospitals = await User.insertMany([
      {
        name: 'Dr. James Mwangi', email: 'hospital1@smartroad.com', password,
        role: 'hospital', phone: '+254700000010',
        hospitalName: 'Nairobi General Hospital', registrationNumber: 'NGH-2024-001',
        address: 'Upper Hill, Nairobi', location: { lat: -1.2833, lng: 36.8167 },
        contactNumber: '+254700000010',
      },
      {
        name: 'Dr. Amina Hassan', email: 'hospital2@smartroad.com', password,
        role: 'hospital', phone: '+254700000011',
        hospitalName: 'Kenyatta National Hospital', registrationNumber: 'KNH-2024-002',
        address: 'Ngong Road, Nairobi', location: { lat: -1.3010, lng: 36.8060 },
        contactNumber: '+254700000011',
      },
      {
        name: 'Dr. Peter Ochieng', email: 'hospital3@smartroad.com', password,
        role: 'hospital', phone: '+254700000012',
        hospitalName: 'Aga Khan University Hospital', registrationNumber: 'AKH-2024-003',
        address: 'Parklands, Nairobi', location: { lat: -1.2636, lng: 36.8030 },
        contactNumber: '+254700000012',
      },
    ]);
    console.log(`  ✅ ${hospitals.length} hospitals seeded\n`);

    /* ===== DRIVERS ===== */
    console.log('🚗 Seeding Drivers...');
    const drivers = await User.insertMany([
      {
        name: 'John Kamau', email: 'driver1@smartroad.com', password,
        role: 'driver', phone: '+254711000001',
        licenseNumber: 'DL-2024-001', vehicleNumber: 'KCA 123A',
        emergencyContacts: [{ name: 'Mary Kamau', relationship: 'Wife', phone: '+254711000100', isPrimary: true }],
        medicalInfo: { bloodGroup: 'O+', allergies: [], medicalConditions: [] },
      },
      {
        name: 'Grace Wanjiku', email: 'driver2@smartroad.com', password,
        role: 'driver', phone: '+254711000002',
        licenseNumber: 'DL-2024-002', vehicleNumber: 'KCB 456B',
        emergencyContacts: [{ name: 'Tom Wanjiku', relationship: 'Husband', phone: '+254711000101', isPrimary: true }],
        medicalInfo: { bloodGroup: 'A+', allergies: ['Penicillin'], medicalConditions: [] },
      },
      {
        name: 'Samuel Otieno', email: 'driver3@smartroad.com', password,
        role: 'driver', phone: '+254711000003',
        licenseNumber: 'DL-2024-003', vehicleNumber: 'KCC 789C',
        emergencyContacts: [{ name: 'Ruth Otieno', relationship: 'Sister', phone: '+254711000102', isPrimary: true }],
        medicalInfo: { bloodGroup: 'B+', allergies: [], medicalConditions: ['Diabetes'] },
      },
      {
        name: 'Fatuma Ali', email: 'driver4@smartroad.com', password,
        role: 'driver', phone: '+254711000004',
        licenseNumber: 'DL-2024-004', vehicleNumber: 'KCD 321D',
        emergencyContacts: [{ name: 'Hassan Ali', relationship: 'Brother', phone: '+254711000103', isPrimary: true }],
        medicalInfo: { bloodGroup: 'AB+', allergies: [], medicalConditions: [] },
      },
      {
        name: 'David Muthoni', email: 'driver5@smartroad.com', password,
        role: 'driver', phone: '+254711000005',
        licenseNumber: 'DL-2024-005', vehicleNumber: 'KCE 654E',
        emergencyContacts: [{ name: 'Jane Muthoni', relationship: 'Mother', phone: '+254711000104', isPrimary: true }],
        medicalInfo: { bloodGroup: 'O-', allergies: [], medicalConditions: [] },
      },
    ]);
    console.log(`  ✅ ${drivers.length} drivers seeded\n`);

    /* ===== RESPONDERS ===== */
    console.log('🚑 Seeding Responders...');
    const responders = await User.insertMany([
      {
        name: 'Alex Njoroge', email: 'responder1@smartroad.com', password,
        role: 'responder', phone: '+254722000001', responderType: 'ambulance',
        hospitalId: hospitals[0]._id, certifications: ['EMT-Basic', 'CPR', 'ACLS'],
        experience: 5, currentLocation: { lat: -1.2921, lng: 36.8219 },
      },
      {
        name: 'Mercy Akinyi', email: 'responder2@smartroad.com', password,
        role: 'responder', phone: '+254722000002', responderType: 'ambulance',
        hospitalId: hospitals[0]._id, certifications: ['EMT-Paramedic', 'CPR', 'PHTLS'],
        experience: 8, currentLocation: { lat: -1.3031, lng: 36.7073 },
      },
      {
        name: 'Brian Kipchoge', email: 'responder3@smartroad.com', password,
        role: 'responder', phone: '+254722000003', responderType: 'ambulance',
        hospitalId: hospitals[1]._id, certifications: ['EMT-Basic', 'CPR'],
        experience: 3, currentLocation: { lat: -1.3192, lng: 36.8800 },
      },
      {
        name: 'Susan Chebet', email: 'responder4@smartroad.com', password,
        role: 'responder', phone: '+254722000004', responderType: 'police',
        hospitalId: hospitals[1]._id, certifications: ['First Aid', 'Crisis Management'],
        experience: 6, currentLocation: { lat: -1.2636, lng: 36.8030 },
      },
      {
        name: 'Kevin Omondi', email: 'responder5@smartroad.com', password,
        role: 'responder', phone: '+254722000005', responderType: 'fire',
        hospitalId: hospitals[2]._id, certifications: ['Fire Safety', 'EMT-Basic', 'Rescue Operations'],
        experience: 10, currentLocation: { lat: -1.2408, lng: 36.8800 },
      },
    ]);
    console.log(`  ✅ ${responders.length} responders seeded\n`);

    /* ===== AMBULANCES ===== */
    console.log('🚑 Seeding Ambulances...');
    const { Ambulance } = require('./models/Ambulance.model');
    await Ambulance.deleteMany({});
    await Ambulance.insertMany([
      { plateNumber: 'KCA 001A', make: 'Toyota',   ambulanceModel: 'HiAce',   year: 2022, status: 'available',    driverName: 'Alex Njoroge',   location: { lat: -1.2921, lng: 36.8219 } },
      { plateNumber: 'KCB 002B', make: 'Mercedes', ambulanceModel: 'Sprinter',year: 2021, status: 'dispatched',   driverName: 'Mercy Akinyi',   location: { lat: -1.3031, lng: 36.7073 } },
      { plateNumber: 'KCC 003C', make: 'Ford',     ambulanceModel: 'Transit', year: 2020, status: 'maintenance',  driverName: 'Brian Kipchoge' },
      { plateNumber: 'KCD 004D', make: 'Toyota',   ambulanceModel: 'HiAce',   year: 2023, status: 'available',    driverName: 'Susan Chebet',   location: { lat: -1.2636, lng: 36.8030 } },
      { plateNumber: 'KCE 005E', make: 'Nissan',   ambulanceModel: 'Urvan',   year: 2019, status: 'offline' },
    ]);
    console.log('  ✅ 5 ambulances seeded\n');

    /* ===== INCIDENTS ===== */
    console.log('🚨 Seeding Incidents...');

    const incidentTypes = ['collision', 'rollover', 'fire', 'medical', 'other'];
    const severities    = ['low', 'medium', 'high', 'critical', 'fatal'];
    const statuses      = ['pending', 'detected', 'confirmed', 'dispatched', 'en-route', 'arrived', 'resolved'];
    const vehicleMakes  = ['Toyota', 'Nissan', 'Isuzu', 'Mitsubishi', 'Subaru'];
    const vehicleModels = ['Corolla', 'Tiida', 'NPR', 'Canter', 'Forester'];
    const vehicleColors = ['White', 'Silver', 'Black', 'Blue', 'Red'];

    const incidents = [];

    for (let i = 0; i < 20; i++) {
      const driver   = drivers[i % drivers.length];
      const location = nairobiLocations[i % nairobiLocations.length];
      const status   = statuses[i % statuses.length];
      const severity = severities[i % severities.length];
      const type     = incidentTypes[i % incidentTypes.length];
      const hoursAgo = randomBetween(0.5, 72);
      const timestamp = new Date(Date.now() - hoursAgo * 3600000);

      const incident: any = {
        incidentId: `INC-2024-${String(i + 1).padStart(4, '0')}`,
        driverId: driver._id,
        driverName: driver.name,
        driverPhone: driver.phone,
        type, severity, status,
        location: {
          type: 'Point',
          coordinates: [
            location.lng + randomBetween(-0.01, 0.01),
            location.lat + randomBetween(-0.01, 0.01),
          ],
        },
        locationAddress: location.address,
        timestamp,
        detectedAt: new Date(timestamp.getTime() + 30000),
        speed: Math.floor(randomBetween(0, 120)),
        impactForce: Math.floor(randomBetween(10, 100)),
        airbagDeployed: Math.random() > 0.5,
        occupants: Math.floor(randomBetween(1, 5)),
        injuries: Math.floor(randomBetween(0, 3)),
        fatalities: severity === 'fatal' ? Math.floor(randomBetween(1, 2)) : 0,
        vehicleNumber: driver.vehicleNumber,
        vehicleMake: vehicleMakes[i % vehicleMakes.length],
        vehicleModel: vehicleModels[i % vehicleModels.length],
        vehicleColor: vehicleColors[i % vehicleColors.length],
        hospitalId: hospitals[i % hospitals.length]._id,
        assignedHospital: hospitals[i % hospitals.length].hospitalName,
        emergencyContacts: [
          { name: 'Emergency Contact', relationship: 'Family', phone: '+254700999000', isNotified: status !== 'pending' }
        ],
        responders: [],
      };

      if (['dispatched', 'en-route', 'arrived', 'resolved'].includes(status)) {
        const responder = responders[i % responders.length];
        incident.responders = [{
          responderId: responder._id,
          name: responder.name,
          type: responder.responderType,
          hospital: hospitals[i % hospitals.length].hospitalName,
          eta: Math.floor(randomBetween(5, 30)),
          distance: parseFloat(randomBetween(1, 15).toFixed(1)),
          status: status === 'resolved' ? 'completed' : 'en-route',
          location: { lat: location.lat, lng: location.lng },
          dispatchedAt: new Date(timestamp.getTime() + 120000),
        }];

        if (['arrived', 'resolved'].includes(status)) {
          incident.confirmedAt = new Date(timestamp.getTime() + 60000);
        }
        if (status === 'resolved') {
          incident.resolvedAt = new Date(timestamp.getTime() + 3600000);
        }
      }

      incidents.push(incident);
    }

    await Incident.insertMany(incidents);
    console.log(`  ✅ ${incidents.length} incidents seeded\n`);
    /* ===== HOSPITAL STATS (Beds) ===== */
    console.log('🛏️  Seeding Hospital Stats...');
    const { HospitalStats } = require('./models/Hospital.model');
    await HospitalStats.deleteMany({});
    await HospitalStats.insertMany([
      {
        hospitalId: hospitals[0]._id,
        beds: 89,
        availableBeds: 31,
        ambulances: 5,
        availableAmbulances: 2,
        responders: 10,
        availableResponders: 6,
        activeIncidents: 3,
        averageResponseTime: 12,
        lastUpdated: new Date(),
        wards: [
          { name: 'ICU',               available: 2,  total: 10, category: 'icu'       },
          { name: 'Emergency',         available: 7,  total: 20, category: 'emergency' },
          { name: 'General Ward A',    available: 12, total: 30, category: 'general'   },
          { name: 'General Ward B',    available: 8,  total: 25, category: 'general'   },
          { name: 'Operating Theatre', available: 2,  total: 4,  category: 'theatre'   },
        ],
      },
      {
        hospitalId: hospitals[1]._id,
        beds: 120,
        availableBeds: 45,
        ambulances: 8,
        availableAmbulances: 3,
        responders: 15,
        availableResponders: 9,
        activeIncidents: 5,
        averageResponseTime: 15,
        lastUpdated: new Date(),
        wards: [
          { name: 'ICU',               available: 4,  total: 15, category: 'icu'       },
          { name: 'Emergency',         available: 10, total: 25, category: 'emergency' },
          { name: 'General Ward A',    available: 18, total: 40, category: 'general'   },
          { name: 'General Ward B',    available: 11, total: 35, category: 'general'   },
          { name: 'Operating Theatre', available: 2,  total: 5,  category: 'theatre'   },
        ],
      },
      {
        hospitalId: hospitals[2]._id,
        beds: 60,
        availableBeds: 22,
        ambulances: 4,
        availableAmbulances: 2,
        responders: 8,
        availableResponders: 5,
        activeIncidents: 2,
        averageResponseTime: 10,
        lastUpdated: new Date(),
        wards: [
          { name: 'ICU',               available: 1,  total: 8,  category: 'icu'       },
          { name: 'Emergency',         available: 5,  total: 15, category: 'emergency' },
          { name: 'General Ward A',    available: 10, total: 25, category: 'general'   },
          { name: 'Operating Theatre', available: 1,  total: 3,  category: 'theatre'   },
        ],
      },
    ]);
    console.log('  ✅ Hospital stats + ward data seeded\n');

    /* ===== AUDIT LOGS ===== */
    console.log('📋 Seeding Audit Logs...');

    const auditActions = [
      { action: 'USER_LOGIN',       targetPrefix: 'User login' },
      { action: 'USER_UPDATED',     targetPrefix: 'User updated' },
      { action: 'USER_ACTIVATED',   targetPrefix: 'User activated' },
      { action: 'USER_DEACTIVATED', targetPrefix: 'User deactivated' },
      { action: 'INCIDENT_VIEWED',  targetPrefix: 'Incident viewed' },
      { action: 'EXPORT_CREATED',   targetPrefix: 'Export job created' },
      { action: 'USER_DELETED',     targetPrefix: 'User deleted' },
      { action: 'DASHBOARD_VIEWED', targetPrefix: 'Dashboard accessed' },
    ];

    const ipAddresses = [
      '127.0.0.1', '192.168.1.10', '192.168.1.15',
      '10.0.0.5',  '41.90.64.12',  '196.201.214.8',
    ];

    const auditLogs = [];

    for (let i = 0; i < 30; i++) {
      const hoursAgo  = randomBetween(0.5, 168); // up to 7 days ago
      const createdAt = new Date(Date.now() - hoursAgo * 3600000);
      const entry     = auditActions[i % auditActions.length];

      // Mix of admin and hospital actors
      const isAdmin  = i % 3 !== 0;
      const actor    = isAdmin ? admin : hospitals[i % hospitals.length];
      const actorRole = isAdmin ? 'admin' : 'hospital';

      // Pick a relevant target
      let target   = '';
      let targetId = '';
      if (entry.action.startsWith('USER')) {
        const u = drivers[i % drivers.length];
        target   = `${u.name} (${u.email})`;
        targetId = String(u._id);
      } else if (entry.action === 'INCIDENT_VIEWED') {
        target   = `INC-2024-${String((i % 20) + 1).padStart(4, '0')}`;
        targetId = String(incidents[i % incidents.length].incidentId ?? '');
      } else if (entry.action === 'EXPORT_CREATED') {
        target   = `${i % 2 === 0 ? 'incidents' : 'audit_log'} CSV export`;
        targetId = `export-seed-${i}`;
      } else {
        target = 'Admin Panel';
      }

      auditLogs.push({
        actorId:   actor._id,
        actorName: actor.name,
        actorRole,
        action:    entry.action,
        target,
        targetId,
        ipAddress: ipAddresses[i % ipAddresses.length],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/146.0.0.0',
        metadata:  { seeded: true },
        createdAt,
        updatedAt: createdAt,
      });
    }

    await AuditLog.insertMany(auditLogs);
    console.log(`  ✅ ${auditLogs.length} audit log entries seeded\n`);

    console.log('═══════════════════════════════════════════');
    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════');
    console.log('\n📋 LOGIN CREDENTIALS (all use Password123!)');
    console.log('ADMIN:     admin@smartroad.com');
    console.log('\nHOSPITALS:');
    console.log('  hospital1@smartroad.com  → Nairobi General Hospital');
    console.log('  hospital2@smartroad.com  → Kenyatta National Hospital');
    console.log('  hospital3@smartroad.com  → Aga Khan University Hospital');
    console.log('\nDRIVERS:   driver1 ~ driver5@smartroad.com');
    console.log('RESPONDERS: responder1 ~ responder5@smartroad.com');
    console.log(`\n📊 Users: ${1 + hospitals.length + drivers.length + responders.length} | Incidents: ${incidents.length} | Audit logs: ${auditLogs.length}`);
    console.log('═══════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedDatabase();
