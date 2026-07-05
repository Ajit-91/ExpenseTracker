import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
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

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
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
