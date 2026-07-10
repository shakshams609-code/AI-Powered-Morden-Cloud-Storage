const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const chatRoutes = require('./routes/chat');
const path = require('path');
const fs = require('fs');

dotenv.config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const app = express();

connectDB();

// Ensure uploads directory exists for local-file fallback
const uploadsDir = path.join(__dirname, 'uploads');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
  console.error('Could not create uploads directory', e.message);
}

// Serve uploaded files when using local fallback
app.use('/uploads', express.static(uploadsDir));

app.use(cors({ origin: true, credentials: true, allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', service: 'cloud-file-storage' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
