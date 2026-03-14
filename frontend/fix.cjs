const fs = require('fs');
const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

// Add imports
c = c.replace(
  "import Register from './components/common/auth/Register';",
  "import Register from './components/common/auth/Register';\nimport ForgotPassword from './components/common/auth/ForgotPassword/ForgotPassword';\nimport ResetPassword from './components/common/auth/ForgotPassword/ResetPassword';"
);

// Add routes
c = c.replace(
  '<Route path="/register" element={<Register />} />',
  '<Route path="/register" element={<Register />} />\n              <Route path="/forgot-password" element={<ForgotPassword />} />\n              <Route path="/reset-password" element={<ResetPassword />} />'
);

fs.writeFileSync(file, c);
console.log('Done');
