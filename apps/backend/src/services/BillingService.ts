/**
 * BillingService.ts
 * 
 * Stripe payment processing and subscription management.
 * Handles:
 * - Checkout session creation for upgrades
 * - Webhook event handling for payment success
 * - User tier updates upon successful payment
 * - Subscription tracking
 */

import Stripe from 'stripe';
import { UserModel } from '../models/User.js';
import { SubscriptionModel } from '../models/Subscription.js';

// Initialize Stripe with API key (will use test key if not configured)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = new Stripe(stripeKey);

/**
 * Checkout session parameters
 */
export interface CheckoutSessionParams {
  userId: string; // User MongoDB ID (ObjectId)
  clerkId: string; // Clerk user ID
  email: string; // User email
  tier: 'pro' | 'enterprise'; // Target tier
  successUrl: string; // Redirect on success
  cancelUrl: string; // Redirect on cancel
}

/**
 * Create a Stripe checkout session for tier upgrade
 * 
 * @param params Checkout parameters
 * @returns Checkout session with client secret and session ID
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<{ sessionId: string; clientSecret: string | null }> {
  const { userId, email, tier, successUrl, cancelUrl } = params;

  // Define price IDs for tiers (from Stripe dashboard)
  const priceIdMap: Record<'pro' | 'enterprise', string> = {
    pro: process.env.STRIPE_PRICE_ID_PRO || 'price_pro_placeholder',
    enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise_placeholder',
  };

  if (!priceIdMap[tier]) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceIdMap[tier],
        quantity: 1,
      },
    ],
    mode: 'subscription',
    customer_email: email,
    client_reference_id: userId, // Reference to MongoDB user ID
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
    },
  });

  if (!session.id) {
    throw new Error('Failed to create Stripe checkout session');
  }

  return {
    sessionId: session.id,
    clientSecret: session.client_secret,
  };
}

/**
 * Handle Stripe webhook events
 * 
 * @param event Stripe webhook event
 * @returns Result of event processing
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // Successful payment - subscription created
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
      break;

    // Invoice payment succeeded
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    // Subscription canceled
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    // Payment failed
    case 'invoice.payment_failed':
      console.warn('Invoice payment failed:', event.data.object);
      break;

    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}

/**
 * Handle subscription created/updated event
 * Creates or updates subscription record in database
 */
async function handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
  if (!subscription.customer) {
    console.warn('Subscription event missing customer ID');
    return;
  }

  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  // Get price ID
  const priceId = subscription.items.data[0]?.price.id;

  // Find or create subscription record
  let subscriptionRecord = await SubscriptionModel.findOne({
    stripeCustomerId: customerId,
  });

  if (!subscriptionRecord) {
    // Create new subscription record
    // Note: In production, link to user via clerkId webhook
    subscriptionRecord = new SubscriptionModel({
      stripeCustomerId: customerId,
      status: mapStripeStatus(subscription.status),
    });
  }

  // Update subscription details
  subscriptionRecord.stripeSubscriptionId = subscription.id;
  subscriptionRecord.status = mapStripeStatus(subscription.status);
  subscriptionRecord.currentPeriodStart = new Date((subscription as any).current_period_start * 1000);
  subscriptionRecord.currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
  subscriptionRecord.trialEnd = subscription.trial_end 
    ? new Date(subscription.trial_end * 1000) 
    : undefined;
  subscriptionRecord.priceId = priceId;
  subscriptionRecord.interval = subscription.items.data[0]?.price.recurring?.interval as 'month' | 'year' || 'month';

  await subscriptionRecord.save();
  console.log(`Subscription ${subscription.id} saved/updated`);
}

/**
 * Handle successful invoice payment - upgrade user tier
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.customer) {
    console.warn('Invoice payment missing customer ID');
    return;
  }

  const customerId = typeof invoice.customer === 'string' 
    ? invoice.customer 
    : invoice.customer.id;

  try {
    // Find subscription by Stripe customer ID
    const subscription = await SubscriptionModel.findOne({
      stripeCustomerId: customerId,
    });

    if (!subscription) {
      console.warn(`Subscription not found for customer ${customerId}`);
      return;
    }

    // Find user by subscription
    const user = await UserModel.findById(subscription.userId);

    if (!user) {
      console.warn(`User not found for subscription ${subscription._id}`);
      return;
    }

    // Determine tier from price ID
    const tierMapping: Record<string, 'pro' | 'enterprise'> = {
      [process.env.STRIPE_PRICE_ID_PRO || '']: 'pro',
      [process.env.STRIPE_PRICE_ID_ENTERPRISE || '']: 'enterprise',
    };

    // Get price ID from invoice items
    const priceId = (invoice.lines.data[0] as any)?.price?.id;
    const newTier = priceId ? tierMapping[priceId] : undefined;

    if (!newTier) {
      console.warn(`Unable to determine tier from invoice ${invoice.id}`);
      return;
    }

    // Update user tier
    const previousTier = user.tier;
    user.tier = newTier;
    user.subscriptionId = subscription._id;
    await user.save();

    console.log(`User ${user._id} upgraded from ${previousTier} to ${newTier}`);

    // Update subscription status
    subscription.status = 'active';
    await subscription.save();
  } catch (error) {
    console.error('Error handling invoice payment success:', error);
    throw error;
  }
}

/**
 * Handle subscription deleted - downgrade user tier
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  if (!subscription.customer) {
    console.warn('Deleted subscription missing customer ID');
    return;
  }

  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  try {
    // Find subscription record
    const subscriptionRecord = await SubscriptionModel.findOne({
      stripeCustomerId: customerId,
    });

    if (!subscriptionRecord) {
      console.warn(`Subscription record not found for customer ${customerId}`);
      return;
    }

    // Find user
    const user = await UserModel.findById(subscriptionRecord.userId);

    if (!user) {
      console.warn(`User not found for subscription ${subscriptionRecord._id}`);
      return;
    }

    // Downgrade to free tier
    const previousTier = user.tier;
    user.tier = 'free';
    user.subscriptionId = undefined;
    await user.save();

    console.log(`User ${user._id} downgraded from ${previousTier} to free`);

    // Update subscription as canceled
    subscriptionRecord.status = 'canceled';
    subscriptionRecord.canceledAt = new Date();
    await subscriptionRecord.save();
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }
}

/**
 * Map Stripe subscription status to internal status
 */
function mapStripeStatus(
  stripeStatus: string
): 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' {
  const statusMap: Record<string, any> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    trialing: 'trialing',
    unpaid: 'unpaid',
  };

  return statusMap[stripeStatus] || 'incomplete';
}

/**
 * Get customer billing portal session
 * Allows user to manage subscription
 */
export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Verify webhook signature
 * 
 * @param body Raw request body
 * @param signature Stripe signature header
 * @returns Parsed event if valid
 */
export function verifyWebhookSignature(body: string, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}
