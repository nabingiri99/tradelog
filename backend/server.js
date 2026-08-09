require('dotenv').config();

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in the environment.');
  process.exit(1);
}

const startServer = async () => {
  try {
    await connectDB();

    require('./services/backup').startBackupScheduler();

    const server = app.listen(PORT, () => {
      console.log(
        `TradeLog API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
      );
    });

    process.on('unhandledRejection', (err) => {
      console.error(`Unhandled rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
