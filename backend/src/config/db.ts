import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/expense_tracker';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Warning: Failed to connect to MongoDB. DB operations will fail. Please set MONGO_URI in backend/.env to your MongoDB Atlas connection string.');
  }
};
