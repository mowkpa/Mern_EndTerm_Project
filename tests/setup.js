import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';

import { User } from '../src/models/user.model.js';
import { Room } from '../src/models/room.model.js';
import { Booking } from '../src/models/booking.model.js';
import { Blackout } from '../src/models/blackout.model.js';
import { Waitlist } from '../src/models/waitlist.model.js';

import { Notification } from '../src/models/notification.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Ensure all partial unique indexes are created in MongoDB
  await Promise.all([
    User.init(),
    Room.init(),
    Booking.init(),
    Blackout.init(),
    Waitlist.init(),
    Notification.init(),
  ]);
});

beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
