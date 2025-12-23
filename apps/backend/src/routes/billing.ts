/**
 * billing.ts
 * 
 * Billing and subscription routes.
 * - POST /api/billing/checkout - Create checkout session for tier upgrade
 * - POST /api/billing/webhook - Handle Stripe webhook events
 * - POST /api/billing/portal - Get customer billing portal session
 */

import express, { type Router, type Request, type Response } from 'express';
import { requireAuth } from '@clerk/express';
import { UserModel } from '../models/User' ;
import {
  createCheckoutSession,
  handleWebhookEvent,
  createBillingPortalSession,
  verifyWebhookSignature,
} from '../services/BillingService' ;

const router: Router = express.Router();

/**
 * POST /api/billing/checkout
 * Create a Stripe checkout session for tier upgrade
 */
router.post('/checkout', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { tier, successUrl, cancelUrl } = req.body;

    // Validate input
    if (!tier || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'Missing required fields: tier, successUrl, cancelUrl',
      });
    }

    if (!['pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    // Get user info from Clerk
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Find or create user in database
    let user = await UserModel.findOne({ clerkId });

    if (!user) {
      // Create new user from Clerk info
      const email = (req as any).auth?.user?.email || '';
      user = new UserModel({
        clerkId,
        email,
        tier: 'free',
        projects: [],
      });
      await user.save();
    }

    // Create checkout session
    const { sessionId, clientSecret } = await createCheckoutSession({
      userId: user._id.toString(),
      clerkId,
      email: user.email,
      tier,
      successUrl,
      cancelUrl,
    });

    return res.json({
      sessionId,
      clientSecret,
      message: 'Checkout session created',
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events (payment succeeded, subscription updated, etc.)
 * Signature verification required
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Get Stripe signature from headers
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    // Get raw body (needed for signature verification)
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify and construct event
    const event = verifyWebhookSignature(rawBody, signature);

    // Handle the event
    await handleWebhookEvent(event);

    // Return success to Stripe
    return res.json({ received: true, eventId: event.id });
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook error';

    // Return 400 for signature verification failures
    if (message.includes('signature')) {
      return res.status(400).json({ error: message });
    }

    // Return 500 for other errors but still acknowledge receipt
    return res.status(500).json({ error: message, received: true });
  }
});

/**
 * POST /api/billing/portal
 * Get customer billing portal URL for subscription management
 */
router.post('/portal', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: 'Missing returnUrl' });
    }

    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Find user
    const user = await UserModel.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get Stripe customer ID from subscription
    if (!user.subscriptionId) {
      return res.status(400).json({
        error: 'User does not have an active subscription',
      });
    }

    const subscription = await (
      await import('../models/Subscription' )
    ).SubscriptionModel.findById(user.subscriptionId);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Create billing portal session
    const portalUrl = await createBillingPortalSession(
      subscription.stripeCustomerId,
      returnUrl
    );

    return res.json({ url: portalUrl });
  } catch (error) {
    console.error('Billing portal error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create portal session';
    return res.status(500).json({ error: message });
  }
});

export default router;
