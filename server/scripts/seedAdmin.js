#!/usr/bin/env node
// server/scripts/seedAdmin.js
// Development-only script to create the initial admin account.
// Run with: npm run seed:admin
// NEVER run this in production with real credentials.
// Reads ADMIN_EMAIL and ADMIN_PASSWORD from the .env file.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const env = require('../src/config/env');

const SEED_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@examportal.dev';
const SEED_NAME = process.env.SEED_ADMIN_NAME || 'System Administrator';
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234!';

const seed = async () => {
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  const existing = await User.findOne({ email: SEED_EMAIL });
  if (existing) {
    console.log(`ℹ️   Admin already exists: ${SEED_EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  const admin = new User({
    name: SEED_NAME,
    email: SEED_EMAIL,
    role: 'ADMIN',
    accountStatus: 'ACTIVE',
    emailVerified: true,
  });

  await admin.hashPassword(SEED_PASSWORD);
  await admin.save();

  console.log(`\n🌱  Admin account created!`);
  console.log(`   Email:    ${SEED_EMAIL}`);
  console.log(`   Password: ${SEED_PASSWORD}`);
  console.log(`\n   ⚠️  Change this password immediately after first login!\n`);

  await mongoose.disconnect();
};

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
