const fs = require('fs');
const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(
  "import HospitalProfile from './components/common/hospital/Settings/HospitalProfile';",
  "import HospitalProfile from './components/common/hospital/Settings/HospitalProfile';\nimport BedTracker from './components/common/hospital/BedTracker';\nimport ETACountdown from './components/common/hospital/ETACountdown';\nimport ShiftManager from './components/common/hospital/ShiftManager';"
);
c = c.replace(
  'path="/hospital/settings"',
  'path="/hospital/beds" element={<ProtectedRoute allowedRoles={[\'hospital\',\'admin\']}><BedTracker /></ProtectedRoute>} />\n              <Route path="/hospital/eta" element={<ProtectedRoute allowedRoles={[\'hospital\',\'admin\']}><ETACountdown /></ProtectedRoute>} />\n              <Route path="/hospital/shifts" element={<ProtectedRoute allowedRoles={[\'hospital\',\'admin\']}><ShiftManager /></ProtectedRoute>} />\n              <Route path="/hospital/settings"'
);
fs.writeFileSync(file, c);
console.log('Done');
