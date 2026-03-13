Smart Accident Detection System
Full Stack Documentation
Version 1.0.0  |  Node.js + React + MongoDB + Socket.IO

Project Overview
The Smart Accident Detection System (SADS) is a real-time emergency response platform designed to detect road accidents, notify nearby hospitals, and coordinate ambulance dispatch. The system integrates IoT sensor data from vehicles, a hospital management dashboard, and live tracking — enabling faster emergency response times and saving lives.

Built with a modern full-stack architecture:
•	Frontend: React + TypeScript + Tailwind CSS + Vite
•	Backend: Node.js + Express + TypeScript
•	Database: MongoDB with Mongoose ODM
•	Real-time: Socket.IO for live incident updates
•	Maps: Google Maps JavaScript API

Features
Hospital Dashboard
•	Real-time incident monitoring with live stats (total, active, pending)
•	Live ambulance tracking with availability status
•	Responder team management and dispatch
•	Interactive incident map with severity color coding
•	Analytics and performance reports (incidents by type, severity, status)
•	Real-time notifications via Socket.IO
Incident Management
•	Automatic incident detection from vehicle sensor data
•	Severity classification (low, medium, high, critical, fatal)
•	Full incident lifecycle: pending → reported → assigned → responding → resolved
•	Witness report submission
•	Incident history with filtering by status, severity, and date range
Ambulance Management
•	Fleet management with status tracking (available, dispatched, maintenance, offline)
•	Driver assignment and GPS location tracking
•	One-click dispatch to active incidents
Responder Management
•	Responder availability tracking
•	Auto-dispatch for critical and high severity incidents
•	ETA calculation and real-time location updates
Analytics & Reporting
•	Incident breakdown by type, severity, and status
•	Average response time calculation
•	Resolution rate tracking
•	Configurable time periods (day, week, month, year)

Architecture Overview
The system follows a three-tier architecture with real-time capabilities:

Layer	Technology	Responsibility
Presentation	React + TypeScript	Hospital dashboard, incident UI, maps
API Layer	Express + TypeScript	REST endpoints, auth middleware, validation
Real-time	Socket.IO	Live incident updates, notifications
Data Layer	MongoDB + Mongoose	Incidents, users, ambulances, hospital stats
Cache	Redis	Incident caching, session management

Project Structure
Frontend (src/)
src/
  components/         # UI components
    Hospital/          # Hospital-specific components
      Cards/           # StatsCard, IncidentCard
      Dashboard/       # HospitalDashboard
      Maps/            # IncidentMap
      Incidents/       # IncidentList, HospitalIncidents
  services/api/        # API service classes
    emergency.service.ts
    hospital.service.ts
    location.service.ts
  types/               # TypeScript interfaces
    emergency.types.ts
    location.types.ts
  hooks/               # Custom React hooks
    useAuth.ts, useSocket.ts

Backend (src/)
src/
  controllers/         # Route handlers
    incident.controller.ts
    hospital.controller.ts
  services/            # Business logic
    incident.service.ts
    notification.service.ts
    responder.service.ts
  models/              # Mongoose schemas
    Incident.model.ts
    Hospital.model.ts
    Ambulance.model.ts
    User.model.ts
  routes/              # Express routers
  middleware/          # Auth, validation, rate limiting

Installation & Setup
Prerequisites
•	Node.js v18+
•	MongoDB (local or MongoDB Atlas)
•	Redis (for caching)
•	Google Maps API Key
Backend Setup
1. Clone the repository and navigate to the backend folder:
git clone <repo-url>
cd backend
npm install

2. Create a .env file in the backend root:
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart-accident-detection
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
NODE_ENV=development

3. Seed the database (optional):
npm run seed

4. Start the backend server:
npm run dev
Server will start on http://localhost:5000
Frontend Setup
1. Navigate to the frontend folder:
cd frontend
npm install

2. Create a .env file in the frontend root:
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here

3. Start the frontend dev server:
npm run dev
Frontend will start on http://localhost:5173

Environment Variables
Backend
Variable	Description	Example
PORT	Server port	5000
MONGODB_URI	MongoDB connection string	mongodb://localhost:27017/sads
JWT_SECRET	JWT signing secret	super_secret_key
JWT_REFRESH_SECRET	Refresh token secret	refresh_secret_key
REDIS_URL	Redis connection URL	redis://localhost:6379
CLIENT_URL	Frontend URL for CORS	http://localhost:5173
NODE_ENV	Environment mode	development

Frontend
Variable	Description	Example
VITE_API_URL	Backend API base URL	http://localhost:5000/api
VITE_SOCKET_URL	Socket.IO server URL	http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY	Google Maps API key	AIzaSy...

API Documentation
Base URL: http://localhost:5000/api
All protected routes require: Authorization: Bearer <token>

Authentication
Method	Endpoint	Description	Auth Required
POST	/auth/register	Register a new user	No
POST	/auth/login	Login and get tokens	No
POST	/auth/refresh-token	Refresh access token	No
POST	/auth/logout	Logout user	Yes

Incidents
Method	Endpoint	Description	Auth Required
GET	/incidents/active	Get all active incidents	Yes (hospital/admin)
GET	/incidents/stats	Get incident statistics	Yes (hospital/admin)
POST	/incidents	Create a new incident	Yes (driver)
GET	/incidents/:id	Get incident by ID	Yes
PUT	/incidents/:id	Update incident	Yes (hospital/admin)
POST	/incidents/:id/accept	Accept an incident	Yes (hospital)
POST	/incidents/:id/resolve	Resolve an incident	Yes
POST	/incidents/:id/cancel	Cancel an incident	Yes
GET	/incidents/:id/report	Generate incident report	Yes (hospital/admin)

Hospitals
Method	Endpoint	Description	Auth Required
GET	/hospitals/dashboard	Get hospital dashboard data	Yes (hospital)
GET	/hospitals/stats	Get ambulance & responder stats	Yes (hospital)
GET	/hospitals/incidents	Get hospital incidents	Yes (hospital)
GET	/hospitals/analytics	Get hospital analytics	Yes (hospital)
PUT	/hospitals/capacity	Update hospital capacity	Yes (hospital)
GET	/hospitals/nearby	Get nearby hospitals	No
PUT	/hospitals/location	Update hospital location	Yes (hospital)

Ambulances
Method	Endpoint	Description	Auth Required
GET	/ambulances	Get all ambulances	Yes
POST	/ambulances	Add new ambulance	Yes (hospital/admin)
PUT	/ambulances/:id/status	Update ambulance status	Yes
DELETE	/ambulances/:id	Remove ambulance	Yes (admin)

Locations
Method	Endpoint	Description	Auth Required
POST	/locations/update	Update driver location	Yes (driver)
GET	/locations/driver/:id	Get driver location	Yes
GET	/locations/nearby	Get nearby drivers	Yes
POST	/locations/distance	Calculate distance	Yes

Real-Time Socket Events
Event	Direction	Description
new-incident	Server → Client	Emitted when a new incident is created
incident-update	Server → Client	Emitted when an incident status changes
responder-location	Server → Client	Responder GPS location update
join-room	Client → Server	Join a specific incident room
leave-room	Client → Server	Leave an incident room

Contributing Guidelines
Getting Started
1. Fork the repository
2. Create a feature branch:
git checkout -b feature/your-feature-name
3. Make your changes following the code style guidelines below
4. Commit your changes:
git commit -m "feat: add your feature description"
5. Push to your branch:
git push origin feature/your-feature-name
6. Open a Pull Request
Commit Message Convention
Follow the Conventional Commits specification:
•	feat: new feature
•	fix: bug fix
•	docs: documentation changes
•	style: formatting, missing semicolons, etc.
•	refactor: code restructuring without feature changes
•	test: adding or updating tests
•	chore: build process or tooling changes
Code Style
•	Use TypeScript for all new files
•	Follow existing naming conventions (camelCase for variables, PascalCase for components)
•	Always define interfaces/types for API responses
•	Use async/await over raw Promises
•	Add error handling with try/catch for all async functions
•	Keep components small and focused — extract logic into custom hooks or services
Branch Strategy
•	main — production-ready code
•	develop — integration branch for features
•	feature/* — individual feature branches
•	fix/* — bug fix branches

Smart Accident Detection System  |  Built with Node.js, React & MongoDB
