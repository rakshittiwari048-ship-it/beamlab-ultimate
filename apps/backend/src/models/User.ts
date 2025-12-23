/**
 * User.ts
 * 
 * Mongoose schema for user accounts linked to Clerk authentication.
 * Tracks user metadata, tier/subscription level, and associated projects.
 */

import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    // Clerk authentication ID
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // User email (from Clerk)
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    // Subscription tier: 'free', 'pro', 'enterprise'
    tier: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },

    // Array of project IDs owned by user
    projects: {
      type: [Schema.Types.ObjectId],
      ref: 'Project',
      default: [],
    },

    // User profile information
    firstName: String,
    lastName: String,
    avatar: String,

    // Subscription reference
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Last login timestamp
    lastLoginAt: Date,
  },
  {
    timestamps: true, // Adds createdAt, updatedAt
  }
);

// Create indexes for common queries
userSchema.index({ clerkId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ tier: 1 });

/**
 * TypeScript interface for User document
 */
export interface UserDocument extends mongoose.Document {
  clerkId: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
  projects: mongoose.Types.ObjectId[];
  firstName?: string;
  lastName?: string;
  avatar?: string;
  subscriptionId?: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
