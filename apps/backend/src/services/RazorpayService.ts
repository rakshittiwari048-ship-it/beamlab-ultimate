// @ts-nocheck
/**
 * RazorpayService.ts
 * 
 * Razorpay payment processing and subscription management for Indian SaaS.
 * Handles:
 * - Subscription creation
 * - Webhook event handling for payment success
 * - User tier updates upon successful payment
 * - Payment signature verification
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { UserModel } from '../models/User.js';
import { SubscriptionModel } from '../models/Subscription.js';

// Initialize Razorpay with API key and secret
const razorpayKey = process.env.RAZORPAY_KEY_ID || '';
const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpay: Razorpay | null = null;

if (!razorpayKey || !razorpaySecret) {
  console.warn('Razorpay credentials not configured. Payment features will not work.');
} else {
  razorpay = new Razorpay({
    key_id: razorpayKey,
    key_secret: razorpaySecret,
  });
}

/**
 * Subscription creation parameters
 */
export interface CreateSubscriptionParams {
  userId: string; // User MongoDB ID (ObjectId)
  clerkId: string; // Clerk user ID
  email: string; // User email
  tier: 'pro' | 'enterprise'; // Target tier
}

/**
 * Create a Razorpay subscription for tier upgrade
 * 
 * @param params Subscription parameters
 * @returns Subscription with subscription_id and other details
 */
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<{
  subscription_id: string;
  plan_id: string;
  status: string;
}> {
  const { userId, tier } = params;

  // Define plan IDs for tiers (from Razorpay dashboard)
  const planIdMap: Record<'pro' | 'enterprise', string> = {
    pro: process.env.RAZORPAY_PLAN_ID_PRO || '',
    enterprise: process.env.RAZORPAY_PLAN_ID_ENTERPRISE || '',
  };

  const planId = planIdMap[tier];
  if (!planId) {
    throw new Error(`Invalid tier or plan ID not configured: ${tier}`);
  }

  if (!razorpay) {
    throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  try {
    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // 12 monthly payments (1 year)
      customer_notify: 1, // Notify customer via email/SMS
      notes: {
        userId,
        tier,
      },
    });

    console.log('Razorpay subscription created:', subscription.id);

    return {
      subscription_id: subscription.id,
      plan_id: subscription.plan_id,
      status: subscription.status,
    };
  } catch (error) {
    console.error('Razorpay subscription creation failed:', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Verify Razorpay payment signature
 * 
 * @param razorpayPaymentId Payment ID from Razorpay
 * @param razorpaySubscriptionId Subscription ID
 * @param razorpaySignature Signature from Razorpay
 * @returns true if signature is valid
 */
export function verifyPaymentSignature(
  razorpayPaymentId: string,
  razorpaySubscriptionId: string,
  razorpaySignature: string
): boolean {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
      .digest('hex');

    return generatedSignature === razorpaySignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 * 
 * @param webhookBody Raw webhook body
 * @param webhookSignature Signature from x-razorpay-signature header
 * @returns true if webhook is authentic
 */
export function verifyWebhookSignature(
  webhookBody: string,
  webhookSignature: string
): boolean {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    
    if (!webhookSecret) {
      console.error('Razorpay webhook secret not configured');
      return false;
    }

    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    return generatedSignature === webhookSignature;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Handle successful subscription payment
 * Updates user tier and creates subscription record
 * 
 * @param subscriptionId Razorpay subscription ID
 * @param paymentId Razorpay payment ID
 */
export async function handleSubscriptionCharged(
  subscriptionId: string,
  paymentId: string
): Promise<void> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured.');
  }

  try {
    // Fetch subscription details from Razorpay
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    const userId = subscription.notes?.userId;
    const tier = subscription.notes?.tier as 'pro' | 'enterprise' | undefined;

    if (!userId || !tier) {
      console.error('Missing userId or tier in subscription notes');
      return;
    }

    // Update user tier
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        tier,
        subscriptionId,
        subscriptionStatus: 'active',
        currentPeriodEnd: new Date(subscription.current_end * 1000),
      },
      { new: true }
    );

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    console.log(`User ${userId} upgraded to ${tier}`);

    // Create or update subscription record
    await SubscriptionModel.findOneAndUpdate(
      { razorpaySubscriptionId: subscriptionId },
      {
        userId: user._id,
        razorpaySubscriptionId: subscriptionId,
        razorpayPlanId: subscription.plan_id,
        status: 'active',
        tier,
        currentPeriodStart: new Date(subscription.start_at * 1000),
        currentPeriodEnd: new Date(subscription.current_end * 1000),
        cancelAtPeriodEnd: false,
      },
      { upsert: true, new: true }
    );

    console.log(`Subscription record updated for ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling subscription charged:', error);
    throw error;
  }
}

/**
 * Handle subscription cancellation
 * 
 * @param subscriptionId Razorpay subscription ID
 */
export async function handleSubscriptionCancelled(
  subscriptionId: string
): Promise<void> {
  try {
    // Find subscription
    const subscription = await SubscriptionModel.findOne({
      razorpaySubscriptionId: subscriptionId,
    });

    if (!subscription) {
      console.error(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // Update subscription status
    subscription.status = 'canceled';
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    // Update user (keep tier until period ends)
    await UserModel.findByIdAndUpdate(subscription.userId, {
      subscriptionStatus: 'canceled',
    });

    console.log(`Subscription cancelled: ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
    throw error;
  }
}

/**
 * Handle subscription completed (reached end)
 * Downgrade user back to free tier
 * 
 * @param subscriptionId Razorpay subscription ID
 */
export async function handleSubscriptionCompleted(
  subscriptionId: string
): Promise<void> {
  try {
    // Find subscription
    const subscription = await SubscriptionModel.findOne({
      razorpaySubscriptionId: subscriptionId,
    });

    if (!subscription) {
      console.error(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // Update subscription status
    subscription.status = 'completed';
    await subscription.save();

    // Downgrade user to free tier
    await UserModel.findByIdAndUpdate(subscription.userId, {
      tier: 'free',
      subscriptionStatus: 'completed',
      subscriptionId: null,
    });

    console.log(`Subscription completed, user downgraded to free: ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling subscription completion:', error);
    throw error;
  }
}

/**
 * Handle Razorpay webhook events
 * 
 * @param event Webhook event from Razorpay
 */
export async function handleWebhookEvent(event: any): Promise<void> {
  const eventType = event.event;
  const payload = event.payload;

  console.log(`Received Razorpay webhook: ${eventType}`);

  try {
    switch (eventType) {
      case 'subscription.charged':
        // Payment successful - activate subscription
        await handleSubscriptionCharged(
          payload.subscription.entity.id,
          payload.payment.entity.id
        );
        break;

      case 'subscription.cancelled':
        // Subscription cancelled
        await handleSubscriptionCancelled(payload.subscription.entity.id);
        break;

      case 'subscription.completed':
        // Subscription completed (all payments done)
        await handleSubscriptionCompleted(payload.subscription.entity.id);
        break;

      case 'subscription.activated':
        console.log('Subscription activated:', payload.subscription.entity.id);
        break;

      case 'subscription.paused':
        console.log('Subscription paused:', payload.subscription.entity.id);
        break;

      case 'subscription.resumed':
        console.log('Subscription resumed:', payload.subscription.entity.id);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }
  } catch (error) {
    console.error(`Error processing webhook ${eventType}:`, error);
    throw error;
  }
}
