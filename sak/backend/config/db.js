const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;
    if (!uri) {
      // Use in-memory MongoDB for local dev when no MONGO_URI provided
      console.log('MONGO_URI not set — starting in-memory MongoDB for development');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      // keep mongod reference to avoid GC (store on process)
      process._local_mongod = mongod;
    }

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
