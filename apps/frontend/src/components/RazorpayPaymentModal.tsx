/**
 * RazorpayPaymentModal.tsx
 * 
 * Razorpay checkout modal for BeamLab subscription payments.
 * Handles:
 * - Loading Razorpay script
 * - Creating subscription
 * - Opening Razorpay checkout
 * - Verifying payment
 * - Updating user tier
 */

import { useState, useEffect } from 'react';

interface RazorpayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: 'pro' | 'enterprise';
  onSuccess: () => void;
}

// Razorpay checkout options
interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    email?: string;
    contact?: string;
  };
  theme?: {
    color: string;
  };
  modal?: {
    ondismiss: () => void;
  };
}

// Razorpay response after payment
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: any;
  }
}

export function RazorpayPaymentModal({
  isOpen,
  onClose,
  tier,
  onSuccess,
}: RazorpayPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    if (!scriptLoaded) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        setError('Failed to load Razorpay. Please check your internet connection.');
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
    return undefined;
  }, [scriptLoaded]);

  const tierDetails = {
    pro: {
      name: 'Pro Plan',
      description: 'Monthly Pro Subscription - ₹2,499/month',
      price: '₹2,499',
    },
    enterprise: {
      name: 'Enterprise Plan',
      description: 'Monthly Enterprise Subscription - ₹9,999/month',
      price: '₹9,999',
    },
  };

  const details = tierDetails[tier];

  // Verify payment with backend
  const verifyPayment = async (
    paymentId: string,
    subscriptionId: string,
    signature: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_subscription_id: subscriptionId,
          razorpay_signature: signature,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      return data.success;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  };

  // Open Razorpay checkout
  const openRazorpayCheckout = async () => {
    if (!scriptLoaded) {
      setError('Razorpay is still loading. Please wait...');
      return;
    }

    if (!window.Razorpay) {
      setError('Razorpay failed to load. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create subscription on backend
      const createResponse = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error || 'Failed to create subscription');
      }

      const { subscription_id } = createData;

      // Step 2: Get Razorpay config
      const configResponse = await fetch('/api/razorpay/config', {
        credentials: 'include',
      });

      const configData = await configResponse.json();

      if (!configResponse.ok) {
        throw new Error(configData.error || 'Failed to get Razorpay config');
      }

      // Step 3: Open Razorpay checkout
      const options: RazorpayOptions = {
        key: configData.key_id,
        subscription_id: subscription_id,
        name: 'BeamLab Ultimate',
        description: details.description,
        handler: async function (response: RazorpayResponse) {
          try {
            // Verify payment signature
            const isValid = await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_subscription_id,
              response.razorpay_signature
            );

            if (isValid) {
              console.log('Payment successful!');
              onSuccess();
              onClose();
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment handler error:', error);
            setError(
              error instanceof Error ? error.message : 'Payment processing failed'
            );
          } finally {
            setIsLoading(false);
          }
        },
        theme: {
          color: '#3b82f6', // Blue color for brand consistency
        },
        modal: {
          ondismiss: function () {
            console.log('Razorpay checkout dismissed');
            setIsLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Razorpay checkout error:', error);
      setError(error instanceof Error ? error.message : 'Failed to open checkout');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upgrade to {details.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isLoading}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {details.description}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {details.price}
              <span className="text-base font-normal text-gray-600 dark:text-gray-400">
                /month
              </span>
            </p>
          </div>

          {tier === 'pro' && (
            <ul className="space-y-2 mb-6">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Unlimited projects
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Advanced analysis features
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Priority support
                </span>
              </li>
            </ul>
          )}

          {tier === 'enterprise' && (
            <ul className="space-y-2 mb-6">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Everything in Pro
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Team collaboration
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Dedicated support
                </span>
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  API access
                </span>
              </li>
            </ul>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={openRazorpayCheckout}
            disabled={isLoading || !scriptLoaded}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : !scriptLoaded ? (
              'Loading Razorpay...'
            ) : (
              'Continue to Payment'
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            Secure payment powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}
