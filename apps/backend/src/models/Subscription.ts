/**
 * Subscription.ts
 * 
 * Mongoose schema for user subscriptions linked to Razorpay payments.
 * Tracks subscription status, billing cycle, and payment method.
 */

import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const subscriptionSchema = new Schema(
  {
    // User reference
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Razorpay subscription ID
    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Razorpay plan ID
    razorpayPlanId: {
      type: String,
      required: true,
    },

    // Subscription status: 'active', 'past_due', 'canceled', 'completed', 'paused'
    status: {
      type: String,
      enum: ['active', 'created', 'authenticated', 'past_due', 'canceled', 'completed', 'paused', 'halted'],
      default: 'created',
      index: true,
    },

    // Subscription tier
    tier: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      required: true,
    },

    // Current billing period start date
    currentPeriodStart: {
      type: Date,
      required: true,
    },

    // Current billing period end date
    currentPeriodEnd: {
      type: Date,
      required: true,
    },

    // Whether subscription cancels at period end
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    // Cancellation date
    canceledAt: Date,

    // Cancel reason if canceled
    cancelReason: String,

    // Metadata for tracking
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Adds createdAt, updatedAt
  }
);

// Create indexes for common queries
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

/**
 * TypeScript interface for Subscription document
 */
export interface SubscriptionDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid';
  currentPeriodEnd: Date;
  currentPeriodStart?: Date;
  trialEnd?: Date;
  priceId?: string;
  interval: 'month' | 'year';
  cancelReason?: string;
  canceledAt?: Date;
  amount?: number;
  currency: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const SubscriptionModel = mongoose.model<SubscriptionDocument>(
  'Subscription',
  subscriptionSchema
);
