/**
 * ProtectedLayout.tsx
 * 
 * Higher-order component that wraps routes requiring authentication.
 * - Checks auth status via useAuth()
 * - Shows loading spinner while auth is loading
 * - Renders content only if authenticated (otherwise returns null for redirect via Clerk)
 */

import { ReactNode } from 'react';
import { useAuth } from '@clerk/react';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  const { userId, isLoaded } = useAuth();

  // Show loading spinner while auth is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, Clerk will automatically handle redirect via middleware
  if (!userId) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
};

export default ProtectedLayout;
