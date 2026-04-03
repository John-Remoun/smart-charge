const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();

// Middleware — set CORS_ORIGIN=https://your-frontend.vercel.app (comma-separated for multiple)
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : null;
app.use(
  cors({
    origin: corsOrigins && corsOrigins.length ? corsOrigins : true,
    credentials: true
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/esp', require('./routes/espRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
