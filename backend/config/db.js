const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    const err = new Error('MONGO_URI is not defined in the environment.');
    console.error(err.message);
    throw err;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
