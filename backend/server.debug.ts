import app from './src/app';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

console.log('í´ Debug mode started');
console.log('Current directory:', process.cwd());

const PORT = process.env.PORT || 5000;
console.log('í³‹ Using port:', PORT);

try {
  console.log('í´§ Creating HTTP server...');
  const server = http.createServer(app);
  
  server.listen(PORT, () => {
    console.log(`âœ… Server running on port ${PORT}`);
    console.log(`í³ http://localhost:${PORT}`);
  });

  server.on('error', (error) => {
    console.error('âŒ Server error:', error);
  });

} catch (error) {
  console.error('âŒ Failed to start server:', error);
}
