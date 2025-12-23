#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * Ensures database indexes and schema are properly configured
 * Run this before deploying to production
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
};

// User Schema Definition (must match User.ts)
const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    projects: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Project',
      default: [],
    },
    firstName: String,
    lastName: String,
    avatar: String,
    subscriptionId: String,
    subscriptionStatus: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
    },
    stripeCustomerId: String,
    currentPeriodEnd: Date,
  },
  {
    timestamps: true,
  }
);

// Project Schema Definition
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: String,
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    thumbnail: String,
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastAnalysisDate: Date,
  },
  {
    timestamps: true,
  }
);

// Subscription Schema Definition
const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripePriceId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
      required: true,
      index: true,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    tier: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

async function connectDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  
  if (!MONGODB_URI) {
    log.error('MONGODB_URI or MONGO_URI environment variable is not set');
    process.exit(1);
  }
  
  try {
    log.info(`Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    log.success('Connected to MongoDB');
  } catch (error) {
    log.error(`Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
}

async function createIndexes() {
  log.info('Creating database indexes...');
  
  try {
    // Define models
    const User = mongoose.model('User', userSchema);
    const Project = mongoose.model('Project', projectSchema);
    const Subscription = mongoose.model('Subscription', subscriptionSchema);
    
    // Create indexes for User model
    log.info('Creating indexes for User collection...');
    await User.createIndexes();
    log.success('✓ User indexes created');
    
    // Verify critical User indexes
    const userIndexes = await User.collection.getIndexes();
    log.info('User indexes:');
    Object.keys(userIndexes).forEach(indexName => {
      console.log(`  - ${indexName}:`, JSON.stringify(userIndexes[indexName]));
    });
    
    // Verify clerkId index exists
    if (!userIndexes.clerkId_1 && !Object.keys(userIndexes).some(key => key.includes('clerkId'))) {
      log.error('Critical: clerkId index is missing!');
      throw new Error('clerkId index not created');
    }
    log.success('✓ Critical clerkId index verified');
    
    // Create indexes for Project model
    log.info('Creating indexes for Project collection...');
    await Project.createIndexes();
    log.success('✓ Project indexes created');
    
    const projectIndexes = await Project.collection.getIndexes();
    log.info('Project indexes:');
    Object.keys(projectIndexes).forEach(indexName => {
      console.log(`  - ${indexName}:`, JSON.stringify(projectIndexes[indexName]));
    });
    
    // Create indexes for Subscription model
    log.info('Creating indexes for Subscription collection...');
    await Subscription.createIndexes();
    log.success('✓ Subscription indexes created');
    
    const subscriptionIndexes = await Subscription.collection.getIndexes();
    log.info('Subscription indexes:');
    Object.keys(subscriptionIndexes).forEach(indexName => {
      console.log(`  - ${indexName}:`, JSON.stringify(subscriptionIndexes[indexName]));
    });
    
    log.success('All indexes created successfully');
  } catch (error) {
    log.error(`Failed to create indexes: ${error.message}`);
    throw error;
  }
}

async function validateData() {
  log.info('Validating existing data...');
  
  try {
    const User = mongoose.model('User');
    
    // Check for duplicate clerkIds
    const duplicateClerkIds = await User.aggregate([
      { $group: { _id: '$clerkId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    
    if (duplicateClerkIds.length > 0) {
      log.error('Found duplicate clerkIds:');
      duplicateClerkIds.forEach(doc => {
        console.log(`  - clerkId: ${doc._id} (${doc.count} duplicates)`);
      });
      throw new Error('Duplicate clerkIds found - manual cleanup required');
    }
    
    // Check for users without clerkId
    const usersWithoutClerkId = await User.countDocuments({ 
      $or: [
        { clerkId: null },
        { clerkId: '' },
        { clerkId: { $exists: false } }
      ]
    });
    
    if (usersWithoutClerkId > 0) {
      log.warning(`Found ${usersWithoutClerkId} users without clerkId - these need manual attention`);
    }
    
    log.success('Data validation completed');
  } catch (error) {
    log.error(`Data validation failed: ${error.message}`);
    throw error;
  }
}

async function runMigration() {
  try {
    log.info('==========================================');
    log.info('BeamLab Database Migration');
    log.info('==========================================');
    console.log('');
    
    await connectDatabase();
    await createIndexes();
    await validateData();
    
    console.log('');
    log.success('==========================================');
    log.success('Migration completed successfully!');
    log.success('==========================================');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.log('');
    log.error('==========================================');
    log.error('Migration failed!');
    log.error('==========================================');
    log.error(error.message);
    console.log('');
    process.exit(1);
  }
}

// Run migration
runMigration();
