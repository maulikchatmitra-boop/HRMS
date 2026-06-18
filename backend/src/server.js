import dotenv from 'dotenv';
import app from './app.js';
import connectDatabase from './database/connection.js';
import { autoBootstrapDatabase } from './database/bootstrap.js';

// Load environment configurations
dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // 1. Establish connection to MongoDB
  await connectDatabase();

  // 2. Automatically sync core system permissions and mappings
  await autoBootstrapDatabase();

  // 3. Start HTTP server listener
  app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

// Handle unhandled promise rejections outside request contexts
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection! Shutting down server...', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception! Shutting down server...', err);
  process.exit(1);
});

startServer();
