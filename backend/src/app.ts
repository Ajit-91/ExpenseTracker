import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import path from 'path';
import axios from 'axios';
import authRoutes from './routes/auth';
import expenseRoutes from './routes/expenses';
import analyticsRoutes from './routes/analytics';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Proxy route to stream APK download from GitHub Release directly
app.get('/download-apk', async (req, res) => {
  try {
    const apkUrl = process.env.APK_DOWNLOAD_URL;
    console.log(`[Download] Proxying APK download from: ${apkUrl}`);

    const response = await axios({
      method: 'get',
      url: apkUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="ExpenseTracker.apk"');

    response.data.pipe(res);
  } catch (error: any) {
    console.error('[Download] Failed to proxy APK download:', error.message);
    res.status(500).send('Failed to download APK. Please try again later.');
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

export default app;
