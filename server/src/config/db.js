import mongoose from 'mongoose';

let mongoMemoryServer = null;

export async function connectDB(customUri = null) {
  if (customUri) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(customUri);
    }
    return mongoose.connection;
  }

  // If in test environment or explicitly requested, use MongoMemoryServer with systemBinary immediately
  if (process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_DB === 'true') {
    if (!mongoMemoryServer) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create({
        binary: {
          systemBinary: '/opt/homebrew/bin/mongod',
          skipDownload: true,
        },
      });
    }
    const memUri = mongoMemoryServer.getUri();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(memUri);
    }
    return mongoose.connection;
  }

  const uri = customUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/pacetrack';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`Connected to MongoDB at ${uri.replace(/\/\/.*@/, '//***@')}`);
  } catch (err) {
    console.warn(`Could not connect to external MongoDB at ${uri}: ${err.message}`);
    console.log('Starting in-memory MongoDB using system mongod binary...');
    
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create({
        binary: {
          systemBinary: '/opt/homebrew/bin/mongod',
          skipDownload: true,
        },
      });
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`Connected to In-Memory MongoDB at ${memUri}`);
    } catch (memErr) {
      console.error('Failed to initialize in-memory MongoDB:', memErr);
      throw memErr;
    }
  }

  return mongoose.connection;
}

export async function disconnectDB(forceStopMemory = false) {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer && forceStopMemory) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
}
