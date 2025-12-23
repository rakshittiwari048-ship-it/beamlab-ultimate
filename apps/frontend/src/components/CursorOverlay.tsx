/**
 * CursorOverlay.tsx
 * 
 * Component to render other users' cursors in the workspace
 * Shows colored cursor indicators with user names
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CursorData } from '../hooks/useMultiplayer';

// ============================================================================
// INTERFACES
// ============================================================================

interface CursorOverlayProps {
  /** Map of user IDs to cursor data */
  cursors: Map<string, CursorData>;
  /** Current user ID (to exclude from rendering) */
  currentUserId?: string;
  /** Whether to show user names */
  showNames?: boolean;
  /** Z-index for the overlay */
  zIndex?: number;
}

interface SingleCursorProps {
  cursor: CursorData;
  showName: boolean;
}

// ============================================================================
// CURSOR SVG ICON
// ============================================================================

const CursorIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
  >
    <path
      d="M5.5 3.21a.5.5 0 0 1 .79-.407l13.04 10.18a.5.5 0 0 1-.29.9l-6.25.36a.5.5 0 0 0-.39.24l-3.23 5.19a.5.5 0 0 1-.89-.15L5.55 3.54a.5.5 0 0 1-.05-.33z"
      fill={color}
      stroke="white"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

// ============================================================================
// SINGLE CURSOR COMPONENT
// ============================================================================

const SingleCursor: React.FC<SingleCursorProps> = ({ cursor, showName }) => {
  const { userName, userColor, screenPosition, selection } = cursor;

  if (!screenPosition) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        position: 'absolute',
        left: screenPosition.x,
        top: screenPosition.y,
        pointerEvents: 'none',
        transform: 'translate(-4px, -4px)',
      }}
    >
      {/* Cursor Icon */}
      <CursorIcon color={userColor} />

      {/* Name Tag */}
      {showName && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-6 top-4 flex items-center gap-1"
        >
          <div
            className="px-2 py-0.5 rounded text-xs font-medium text-white shadow-lg whitespace-nowrap"
            style={{ backgroundColor: userColor }}
          >
            {userName}
          </div>
          {selection && (
            <div className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300">
              {selection.type}: {selection.id}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

// ============================================================================
// MAIN OVERLAY COMPONENT
// ============================================================================

export const CursorOverlay: React.FC<CursorOverlayProps> = ({
  cursors,
  currentUserId,
  showNames = true,
  zIndex = 1000,
}) => {
  // Filter out current user and expired cursors (older than 5 seconds)
  const activeCursors = useMemo(() => {
    const now = Date.now();
    const filtered: CursorData[] = [];

    cursors.forEach((cursor, id) => {
      if (id === currentUserId) return;
      if (now - cursor.timestamp > 5000) return;
      if (!cursor.screenPosition) return;
      filtered.push(cursor);
    });

    return filtered;
  }, [cursors, currentUserId]);

  if (activeCursors.length === 0) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex }}
    >
      <AnimatePresence mode="popLayout">
        {activeCursors.map((cursor) => (
          <SingleCursor
            key={cursor.userId}
            cursor={cursor}
            showName={showNames}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// USER PRESENCE INDICATOR
// ============================================================================

interface UserPresenceProps {
  users: Array<{
    id: string;
    name: string;
    color: string;
    avatar?: string;
  }>;
  maxVisible?: number;
  className?: string;
}

export const UserPresence: React.FC<UserPresenceProps> = ({
  users,
  maxVisible = 4,
  className = '',
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  if (users.length === 0) return null;

  return (
    <div className={`flex items-center ${className}`}>
      {/* User Avatars */}
      <div className="flex -space-x-2">
        <AnimatePresence mode="popLayout">
          {visibleUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
              title={user.name}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Online indicator */}
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-green-500"
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Remaining count */}
        {remainingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold"
          >
            +{remainingCount}
          </motion.div>
        )}
      </div>

      {/* Label */}
      <span className="ml-3 text-sm text-gray-600">
        {users.length === 1
          ? '1 collaborator'
          : `${users.length} collaborators`}
      </span>
    </div>
  );
};

// ============================================================================
// CONNECTION STATUS INDICATOR
// ============================================================================

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        color: isConnected ? '#059669' : '#DC2626',
      }}
    >
      <motion.span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: isConnected ? '#10B981' : '#EF4444' }}
        animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      {isConnected ? 'Live' : 'Offline'}
    </motion.div>
  );
};

// ============================================================================
// COLLABORATION TOAST
// ============================================================================

interface CollaborationToastProps {
  type: 'join' | 'leave' | 'update';
  userName: string;
  userColor: string;
  message?: string;
  onClose: () => void;
}

export const CollaborationToast: React.FC<CollaborationToastProps> = ({
  type,
  userName,
  userColor,
  message,
  onClose,
}) => {
  const icons = {
    join: '👋',
    leave: '🚪',
    update: '✏️',
  };

  const defaultMessages = {
    join: 'joined the project',
    leave: 'left the project',
    update: 'made changes',
  };

  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-lg border border-gray-200"
    >
      <span className="text-lg">{icons[type]}</span>
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: userColor }}
        />
        <span className="font-medium text-gray-900">{userName}</span>
        <span className="text-gray-600">{message || defaultMessages[type]}</span>
      </div>
    </motion.div>
  );
};

export default CursorOverlay;
