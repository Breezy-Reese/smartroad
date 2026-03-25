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

// ── Notification Schemas
const NotificationPrefsSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  pushEnabled: { type: Boolean, default: true },
  smsEnabled: { type: Boolean, default: true },
  smsPhoneNumber: { type: String },
  emailEnabled: { type: Boolean, default: false },
  emailAddress: { type: String },
  smsFallbackOnPushFail: { type: Boolean, default: true },
  quietHoursEnabled: { type: Boolean, default: false },
  quietHoursStart: { type: String, default: '22:00' },
  quietHoursEnd: { type: String, default: '07:00' },
}, { timestamps: true });

const EscalationPolicySchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, default: 'Default Escalation Policy' },
  steps: [{
    level: { type: Number, required: true },
    delaySeconds: { type: Number, default: 0 },
    recipients: [{ type: String }],
    channels: [{ type: String }],
  }],
}, { timestamps: true });

const DeliveryReceiptSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: String, required: true },
  recipientName: { type: String, required: true },
  channel: { type: String, enum: ['push', 'sms', 'email', 'call'], required: true },
  status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed', 'read'], default: 'pending' },
  sentAt: { type: Date, default: Date.now },
  deliveredAt: Date,
  readAt: Date,
  failureReason: String,
  retryCount: { type: Number, default: 0 },
}, { timestamps: true });

const NotificationLogSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  escalationLevel: { type: Number, default: 1 },
  triggeredAt: { type: Date, default: Date.now },
  recipients: [{ type: String }],
  channels: [{ type: String }],
  receipts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryReceipt' }],
  status: { type: String, enum: ['triggered', 'in-progress', 'completed', 'failed'], default: 'triggered' },
}, { timestamps: true });

// ── Audit Log Schema
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
const NotificationPrefs = mongoose.model('NotificationPrefs', NotificationPrefsSchema);
const EscalationPolicy = mongoose.model('EscalationPolicy', EscalationPolicySchema);
const DeliveryReceipt = mongoose.model('DeliveryReceipt', DeliveryReceiptSchema);
const NotificationLog = mongoose.model('NotificationLog', NotificationLogSchema);

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
    await NotificationPrefs.deleteMany({});
    await EscalationPolicy.deleteMany({});
    await DeliveryReceipt.deleteMany({});
    await NotificationLog.deleteMany({});
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
        emergencyContacts: [
          { name: 'Mary Kamau', relationship: 'Wife', phone: '+254711000100', email: 'mary@example.com', isPrimary: true },
          { name: 'Peter Kamau', relationship: 'Brother', phone: '+254711000101', email: 'peter@example.com', isPrimary: false }
        ],
        medicalInfo: { bloodGroup: 'O+', allergies: [], medicalConditions: [] },
      },
      {
        name: 'Grace Wanjiku', email: 'driver2@smartroad.com', password,
        role: 'driver', phone: '+254711000002',
        licenseNumber: 'DL-2024-002', vehicleNumber: 'KCB 456B',
        emergencyContacts: [
          { name: 'Tom Wanjiku', relationship: 'Husband', phone: '+254711000102', email: 'tom@example.com', isPrimary: true },
          { name: 'Sarah Wanjiku', relationship: 'Sister', phone: '+254711000103', email: 'sarah@example.com', isPrimary: false }
        ],
        medicalInfo: { bloodGroup: 'A+', allergies: ['Penicillin'], medicalConditions: [] },
      },
      {
        name: 'Samuel Otieno', email: 'driver3@smartroad.com', password,
        role: 'driver', phone: '+254711000003',
        licenseNumber: 'DL-2024-003', vehicleNumber: 'KCC 789C',
        emergencyContacts: [
          { name: 'Ruth Otieno', relationship: 'Sister', phone: '+254711000104', email: 'ruth@example.com', isPrimary: true },
          { name: 'Michael Otieno', relationship: 'Brother', phone: '+254711000105', email: 'michael@example.com', isPrimary: false }
        ],
        medicalInfo: { bloodGroup: 'B+', allergies: [], medicalConditions: ['Diabetes'] },
      },
      {
        name: 'Fatuma Ali', email: 'driver4@smartroad.com', password,
        role: 'driver', phone: '+254711000004',
        licenseNumber: 'DL-2024-004', vehicleNumber: 'KCD 321D',
        emergencyContacts: [
          { name: 'Hassan Ali', relationship: 'Brother', phone: '+254711000106', email: 'hassan@example.com', isPrimary: true },
          { name: 'Aisha Ali', relationship: 'Sister', phone: '+254711000107', email: 'aisha@example.com', isPrimary: false }
        ],
        medicalInfo: { bloodGroup: 'AB+', allergies: [], medicalConditions: [] },
      },
      {
        name: 'David Muthoni', email: 'driver5@smartroad.com', password,
        role: 'driver', phone: '+254711000005',
        licenseNumber: 'DL-2024-005', vehicleNumber: 'KCE 654E',
        emergencyContacts: [
          { name: 'Jane Muthoni', relationship: 'Mother', phone: '+254711000108', email: 'jane@example.com', isPrimary: true },
          { name: 'Paul Muthoni', relationship: 'Father', phone: '+254711000109', email: 'paul@example.com', isPrimary: false }
        ],
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
    try {
      const { Ambulance } = require('./models/Ambulance.model');
      await Ambulance.deleteMany({});
      await Ambulance.insertMany([
        { plateNumber: 'KCA 001A', make: 'Toyota', ambulanceModel: 'HiAce', year: 2022, status: 'available', driverName: 'Alex Njoroge', location: { lat: -1.2921, lng: 36.8219 } },
        { plateNumber: 'KCB 002B', make: 'Mercedes', ambulanceModel: 'Sprinter', year: 2021, status: 'dispatched', driverName: 'Mercy Akinyi', location: { lat: -1.3031, lng: 36.7073 } },
        { plateNumber: 'KCC 003C', make: 'Ford', ambulanceModel: 'Transit', year: 2020, status: 'maintenance', driverName: 'Brian Kipchoge' },
        { plateNumber: 'KCD 004D', make: 'Toyota', ambulanceModel: 'HiAce', year: 2023, status: 'available', driverName: 'Susan Chebet', location: { lat: -1.2636, lng: 36.8030 } },
        { plateNumber: 'KCE 005E', make: 'Nissan', ambulanceModel: 'Urvan', year: 2019, status: 'offline' },
      ]);
      console.log('  ✅ 5 ambulances seeded\n');
    } catch (error) {
      console.log('  ⚠️ Ambulance seeding skipped (model not found)\n');
    }

    /* ===== NOTIFICATION PREFERENCES ===== */
    console.log('🔔 Seeding Notification Preferences...');
    const notificationPrefs = [];
    for (const driver of drivers) {
      notificationPrefs.push({
        driverId: driver._id,
        pushEnabled: true,
        smsEnabled: true,
        smsPhoneNumber: driver.phone,
        emailEnabled: true,
        emailAddress: driver.email,
        smsFallbackOnPushFail: true,
        quietHoursEnabled: Math.random() > 0.7,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      });
    }
    await NotificationPrefs.insertMany(notificationPrefs);
    console.log(`  ✅ ${notificationPrefs.length} notification preferences seeded\n`);

    /* ===== ESCALATION POLICIES ===== */
    console.log('📈 Seeding Escalation Policies...');
    const escalationPolicies = [];
    const defaultSteps = [
      { level: 1, delaySeconds: 0, recipients: ['primary_kin'], channels: ['push', 'sms'] },
      { level: 2, delaySeconds: 60, recipients: ['primary_kin', 'secondary_kin'], channels: ['sms', 'call'] },
      { level: 3, delaySeconds: 180, recipients: ['all_kin', 'fleet_manager'], channels: ['sms', 'call', 'email'] },
    ];
    
    for (const driver of drivers) {
      escalationPolicies.push({
        driverId: driver._id,
        name: `${driver.name}'s Escalation Policy`,
        steps: defaultSteps,
      });
    }
    await EscalationPolicy.insertMany(escalationPolicies);
    console.log(`  ✅ ${escalationPolicies.length} escalation policies seeded\n`);

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
        incidentId: `INC-${Date.now()}-${String(i + 1).padStart(3, '0')}`,
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
        emergencyContacts: driver.emergencyContacts.map((ec: any) => ({
          name: ec.name,
          relationship: ec.relationship,
          phone: ec.phone,
          isNotified: status !== 'pending'
        })),
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

    /* ===== DELIVERY RECEIPTS - ENHANCED WITH PENDING & DELIVERED ===== */
    console.log('📨 Seeding Delivery Receipts...');
    const deliveryReceipts = [];
    const channels = ['push', 'sms', 'email', 'call'];
    
    // Create explicit counts for each receipt status
    const receiptStatusDistribution = [
      { status: 'pending', count: 25, channels: ['push', 'sms'] },
      { status: 'delivered', count: 40, channels: ['sms', 'push', 'email'] },
      { status: 'sent', count: 10, channels: ['push', 'sms'] },
      { status: 'failed', count: 15, channels: ['sms', 'email'] },
      { status: 'read', count: 20, channels: ['sms', 'push'] }
    ];
    
    let receiptCounter = 0;
    
    // Generate receipts based on distribution
    for (const dist of receiptStatusDistribution) {
      for (let i = 0; i < dist.count; i++) {
        const incident = incidents[receiptCounter % incidents.length];
        const driver = drivers.find(d => d._id.toString() === incident.driverId.toString());
        const contacts = driver?.emergencyContacts || [];
        
        // Use primary contact for most, secondary for some
        const contactIndex = (receiptCounter % 2 === 0) ? 0 : (contacts.length > 1 ? 1 : 0);
        const contact = contacts[contactIndex] || { name: 'Emergency Contact', phone: driver?.phone || '+254700000000' };
        
        const channel = dist.channels[receiptCounter % dist.channels.length];
        const hoursAgo = randomBetween(0, 120); // Up to 5 days ago
        const sentAt = new Date(Date.now() - hoursAgo * 3600000);
        
        const receipt: any = {
          incidentId: incident.incidentId,
          driverId: driver?._id,
          recipientId: contact.isPrimary ? 'primary' : 'secondary',
          recipientName: contact.name,
          channel,
          status: dist.status,
          sentAt,
          retryCount: dist.status === 'failed' ? Math.floor(randomBetween(1, 4)) : 0,
        };
        
        // Add deliveredAt for delivered/read receipts
        if (dist.status === 'delivered' || dist.status === 'read') {
          receipt.deliveredAt = new Date(sentAt.getTime() + randomBetween(2000, 45000));
        }
        
        // Add readAt for read receipts
        if (dist.status === 'read') {
          receipt.readAt = new Date(receipt.deliveredAt.getTime() + randomBetween(1000, 180000));
        }
        
        // Add failure reason for failed receipts
        if (dist.status === 'failed') {
          const failureReasons = [
            'SMS gateway timeout - no response',
            'Invalid phone number format',
            'Mobile network unreachable',
            'Rate limit exceeded - too many messages',
            'Recipient phone turned off',
            'Service provider error: 500',
            'Message rejected by carrier'
          ];
          receipt.failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];
        }
        
        // Add message content for push receipts
        if (channel === 'push') {
          receipt.messageContent = `🚨 Emergency alert: ${incident.type} incident reported at ${incident.locationAddress || 'your location'}. Severity: ${incident.severity}`;
        }
        
        // Add tracking ID for SMS receipts
        if (channel === 'sms') {
          receipt.trackingId = `SMS-${Date.now()}-${receiptCounter}`;
        }
        
        deliveryReceipts.push(receipt);
        receiptCounter++;
      }
    }
    
    // Add additional receipts for recent incidents (last 24 hours)
    const recentIncidents = incidents.filter(inc => {
      const hoursAgo = (Date.now() - new Date(inc.timestamp).getTime()) / 3600000;
      return hoursAgo < 24;
    });
    
    for (let i = 0; i < 15; i++) {
      const incident = recentIncidents[i % recentIncidents.length] || incidents[i % incidents.length];
      const driver = drivers.find(d => d._id.toString() === incident.driverId.toString());
      const contacts = driver?.emergencyContacts || [];
      const contact = contacts[0] || { name: 'Emergency Contact', phone: driver?.phone || '+254700000000' };
      
      // Recent incidents more likely to have pending or sent status
      const statusOptions = ['pending', 'sent', 'delivered'];
      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      const channel = ['push', 'sms'][Math.floor(Math.random() * 2)];
      const minutesAgo = randomBetween(5, 120);
      const sentAt = new Date(Date.now() - minutesAgo * 60000);
      
      const receipt: any = {
        incidentId: incident.incidentId,
        driverId: driver?._id,
        recipientId: 'primary',
        recipientName: contact.name,
        channel,
        status,
        sentAt,
        retryCount: 0,
      };
      
      if (status === 'delivered') {
        receipt.deliveredAt = new Date(sentAt.getTime() + randomBetween(1000, 10000));
      }
      
      deliveryReceipts.push(receipt);
    }
    
    await DeliveryReceipt.insertMany(deliveryReceipts);
    
    // Count receipts by status
    const pendingCount = deliveryReceipts.filter(r => r.status === 'pending').length;
    const deliveredCount = deliveryReceipts.filter(r => r.status === 'delivered').length;
    const sentCount = deliveryReceipts.filter(r => r.status === 'sent').length;
    const failedCount = deliveryReceipts.filter(r => r.status === 'failed').length;
    const readCount = deliveryReceipts.filter(r => r.status === 'read').length;
    
    console.log(`  ✅ ${deliveryReceipts.length} delivery receipts seeded`);
    console.log(`     📊 Status Breakdown:`);
    console.log(`        Pending:   ${pendingCount}`);
    console.log(`        Sent:      ${sentCount}`);
    console.log(`        Delivered: ${deliveredCount}`);
    console.log(`        Read:      ${readCount}`);
    console.log(`        Failed:    ${failedCount}\n`);

    /* ===== NOTIFICATION LOGS ===== */
    console.log('📋 Seeding Notification Logs...');
    const notificationLogs = [];
    const escalationLevels = [1, 2, 3];
    const logStatuses = ['triggered', 'in-progress', 'completed', 'failed'];
    
    for (let i = 0; i < 40; i++) {
      const incident = incidents[i % incidents.length];
      const driver = drivers.find(d => d._id.toString() === incident.driverId.toString());
      const level = escalationLevels[i % escalationLevels.length];
      const status = logStatuses[i % logStatuses.length];
      const hoursAgo = randomBetween(0, 168);
      
      // Get receipts for this incident
      const relatedReceipts = deliveryReceipts
        .filter(r => r.incidentId === incident.incidentId)
        .slice(0, level * 3);
      
      notificationLogs.push({
        incidentId: incident.incidentId,
        driverId: driver?._id,
        escalationLevel: level,
        triggeredAt: new Date(Date.now() - hoursAgo * 3600000),
        recipients: driver?.emergencyContacts?.map((ec: any) => ec.name) || ['Emergency Contact'],
        channels: channels.slice(0, level),
        receipts: relatedReceipts.map(r => r._id),
        status,
      });
    }
    
    await NotificationLog.insertMany(notificationLogs);
    console.log(`  ✅ ${notificationLogs.length} notification logs seeded\n`);

    /* ===== HOSPITAL STATS (Beds) ===== */
    console.log('🛏️  Seeding Hospital Stats...');
    try {
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
            { name: 'ICU', available: 2, total: 10, category: 'icu' },
            { name: 'Emergency', available: 7, total: 20, category: 'emergency' },
            { name: 'General Ward A', available: 12, total: 30, category: 'general' },
            { name: 'General Ward B', available: 8, total: 25, category: 'general' },
            { name: 'Operating Theatre', available: 2, total: 4, category: 'theatre' },
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
            { name: 'ICU', available: 4, total: 15, category: 'icu' },
            { name: 'Emergency', available: 10, total: 25, category: 'emergency' },
            { name: 'General Ward A', available: 18, total: 40, category: 'general' },
            { name: 'General Ward B', available: 11, total: 35, category: 'general' },
            { name: 'Operating Theatre', available: 2, total: 5, category: 'theatre' },
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
            { name: 'ICU', available: 1, total: 8, category: 'icu' },
            { name: 'Emergency', available: 5, total: 15, category: 'emergency' },
            { name: 'General Ward A', available: 10, total: 25, category: 'general' },
            { name: 'Operating Theatre', available: 1, total: 3, category: 'theatre' },
          ],
        },
      ]);
      console.log('  ✅ Hospital stats + ward data seeded\n');
    } catch (error) {
      console.log('  ⚠️ Hospital stats seeding skipped (model not found)\n');
    }

    /* ===== AUDIT LOGS ===== */
    console.log('📋 Seeding Audit Logs...');

    const auditActions = [
      { action: 'USER_LOGIN', targetPrefix: 'User login' },
      { action: 'USER_UPDATED', targetPrefix: 'User updated' },
      { action: 'USER_ACTIVATED', targetPrefix: 'User activated' },
      { action: 'USER_DEACTIVATED', targetPrefix: 'User deactivated' },
      { action: 'INCIDENT_VIEWED', targetPrefix: 'Incident viewed' },
      { action: 'EXPORT_CREATED', targetPrefix: 'Export job created' },
      { action: 'USER_DELETED', targetPrefix: 'User deleted' },
      { action: 'DASHBOARD_VIEWED', targetPrefix: 'Dashboard accessed' },
      { action: 'ESCALATION_TRIGGERED', targetPrefix: 'Escalation triggered' },
      { action: 'NOTIFICATION_SENT', targetPrefix: 'Notification sent' },
    ];

    const ipAddresses = [
      '127.0.0.1', '192.168.1.10', '192.168.1.15',
      '10.0.0.5', '41.90.64.12', '196.201.214.8',
    ];

    const auditLogs = [];

    for (let i = 0; i < 60; i++) {
      const hoursAgo = randomBetween(0.5, 168);
      const createdAt = new Date(Date.now() - hoursAgo * 3600000);
      const entry = auditActions[i % auditActions.length];

      let actor;
      let actorRole;
      if (i % 3 === 0) {
        actor = admin;
        actorRole = 'admin';
      } else if (i % 3 === 1) {
        actor = hospitals[i % hospitals.length];
        actorRole = 'hospital';
      } else {
        actor = drivers[i % drivers.length];
        actorRole = 'driver';
      }

      let target = '';
      let targetId = '';
      if (entry.action.startsWith('USER')) {
        const u = drivers[i % drivers.length];
        target = `${u.name} (${u.email})`;
        targetId = String(u._id);
      } else if (entry.action === 'INCIDENT_VIEWED') {
        target = incidents[i % incidents.length].incidentId;
        targetId = String(incidents[i % incidents.length]._id);
      } else if (entry.action === 'ESCALATION_TRIGGERED') {
        target = `Escalation for ${incidents[i % incidents.length].incidentId}`;
        targetId = incidents[i % incidents.length].incidentId;
      } else if (entry.action === 'NOTIFICATION_SENT') {
        target = `Notification to ${drivers[i % drivers.length].name}`;
        targetId = String(drivers[i % drivers.length]._id);
      } else if (entry.action === 'EXPORT_CREATED') {
        target = `${i % 2 === 0 ? 'incidents' : 'audit_log'} CSV export`;
        targetId = `export-seed-${i}`;
      } else {
        target = 'Admin Panel';
      }

      auditLogs.push({
        actorId: actor._id,
        actorName: actor.name,
        actorRole,
        action: entry.action,
        target,
        targetId,
        ipAddress: ipAddresses[i % ipAddresses.length],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/146.0.0.0',
        metadata: { seeded: true, timestamp: new Date().toISOString() },
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
    console.log(`\n📊 Summary:`);
    console.log(`   Users: ${1 + hospitals.length + drivers.length + responders.length}`);
    console.log(`   Incidents: ${incidents.length}`);
    console.log(`   Receipts: ${deliveryReceipts.length}`);
    console.log(`     - Pending: ${pendingCount}`);
    console.log(`     - Delivered: ${deliveredCount}`);
    console.log(`     - Failed: ${failedCount}`);
    console.log(`   Notification Logs: ${notificationLogs.length}`);
    console.log(`   Audit logs: ${auditLogs.length}`);
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