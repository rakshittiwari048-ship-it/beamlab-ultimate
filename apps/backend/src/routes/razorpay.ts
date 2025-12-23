/**
 * razorpay.ts
 * 
 * Razorpay payment and subscription routes for BeamLab.
 * - POST /api/razorpay/create-subscription - Create subscription for tier upgrade
 * - POST /api/razorpay/verify-payment - Verify payment signature after checkout
 * - POST /api/razorpay/webhook - Handle Razorpay webhook events
 */

import express, { type Router, type Request, type Response } from 'express';
import { requireAuth } from '@clerk/express';
import { UserModel } from '../models/User.js';
import {
  createSubscription,
  verifyPaymentSignature,
  verifyWebhookSignature,
  handleWebhookEvent,
} from '../services/RazorpayService.js';

const router: Router = express.Router();

/**
 * POST /api/razorpay/create-subscription
 * Create a Razorpay subscription for tier upgrade
 */
router.post('/create-subscription', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { tier } = req.body;

    // Validate input
    if (!tier) {
      return res.status(400).json({
        error: 'Missing required field: tier',
      });
    }

    if (!['pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Must be "pro" or "enterprise"' });
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
      const email = (req as any).auth?.sessionClaims?.email || '';
      user = new UserModel({
        clerkId,
        email,
        tier: 'free',
        projects: [],
      });
      await user.save();
    }

    // Create Razorpay subscription
    const subscription = await createSubscription({
      userId: user._id.toString(),
      clerkId,
      email: user.email,
      tier,
    });

    return res.json({
      subscription_id: subscription.subscription_id,
      plan_id: subscription.plan_id,
      status: subscription.status,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create subscription';
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/razorpay/verify-payment
 * Verify payment signature after successful checkout
 */
router.post('/verify-payment', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

    // Validate input
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'Missing required fields: razorpay_payment_id, razorpay_subscription_id, razorpay_signature',
      });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid payment signature',
        success: false,
      });
    }

    // Get user info
    const clerkId = (req as any).auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Find user
    const user = await UserModel.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`Payment verified for user ${user._id}: ${razorpay_payment_id}`);

    return res.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      subscription_id: razorpay_subscription_id,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    const message = error instanceof Error ? error.message : 'Payment verification failed';
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/razorpay/webhook
 * Handle Razorpay webhook events
 * Signature verification required
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Get Razorpay signature from headers
    const signature = req.headers['x-razorpay-signature'];

    if (!signature || typeof signature !== 'string') {
      console.error('Missing Razorpay signature');
      return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
    }

    // Get raw body (needed for signature verification)
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Process webhook event
    const event = req.body;
    await handleWebhookEvent(event);

    // Acknowledge receipt
    return res.json({ status: 'ok', received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/razorpay/config
 * Get Razorpay public configuration (key_id for frontend)
 */
router.get('/config', (_req: Request, res: Response) => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  
  if (!keyId) {
    return res.status(500).json({ error: 'Razorpay not configured' });
  }

  return res.json({
    key_id: keyId,
    currency: 'INR',
    name: 'BeamLab Ultimate',
    description: 'Structural Analysis Software',
  });
});

export default router;
