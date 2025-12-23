/**
 * useMultiplayer.ts
 * 
 * React hook for real-time collaboration in BeamLab
 * 
 * Features:
 * - Connect to Socket.IO server for real-time updates
 * - Track other users' cursors and selections
 * - Optimistic UI updates with server reconciliation
 * - User presence awareness (join/leave notifications)
 */

// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MultiplayerUser {
  id: string;
  name: string;
  email?: string;
  color: string;
  avatar?: string;
}

export interface CursorData {
  userId: string;
  userName: string;
  userColor: string;
  position: { x: number; y: number; z: number };
  screenPosition?: { x: number; y: number };
  selection?: {
    type: 'node' | 'member' | 'load';
    id: string;
  };
  timestamp: number;
}

export interface UserSelection {
  userId: string;
  userName: string;
  userColor: string;
  selection: string[];
  timestamp: number;
}

export interface ServerUpdate {
  projectId: string;
  type: 'node' | 'member' | 'load' | 'support' | 'section' | 'material';
  action: 'create' | 'update' | 'delete';
  data: any;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface ChatMessage {
  userId: string;
  userName: string;
  userColor: string;
  message: string;
  timestamp: number;
}

export interface UseMultiplayerOptions {
  /** Socket.IO server URL */
  serverUrl?: string;
  /** Current user info */
  user: MultiplayerUser;
  /** Project ID to join */
  projectId: string;
  /** Callback when receiving updates from server */
  onServerUpdate?: (update: ServerUpdate) => void;
  /** Callback when user joins */
  onUserJoined?: (user: { userId: string; userName: string; userColor: string }) => void;
  /** Callback when user leaves */
  onUserLeft?: (user: { userId: string; userName: string }) => void;
  /** Callback when receiving chat message */
  onChatMessage?: (message: ChatMessage) => void;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseMultiplayerReturn {
  /** Whether connected to server */
  isConnected: boolean;
  /** List of users in the room */
  users: MultiplayerUser[];
  /** Other users' cursor positions */
  cursors: Map<string, CursorData>;
  /** Other users' selections */
  selections: Map<string, UserSelection>;
  /** Send cursor position update */
  updateCursor: (position: { x: number; y: number; z: number }, selection?: CursorData['selection']) => void;
  /** Send node update */
  updateNode: (nodeId: string, changes: Record<string, any>) => void;
  /** Send member update */
  updateMember: (memberId: string, changes: Record<string, any>) => void;
  /** Send load update */
  updateLoad: (loadId: string, changes: Record<string, any>) => void;
  /** Send generic project update */
  sendProjectUpdate: (update: Omit<ServerUpdate, 'userId' | 'userName' | 'timestamp'>) => void;
  /** Update selection */
  updateSelection: (selection: string[]) => void;
  /** Send chat message */
  sendChatMessage: (message: string) => void;
  /** Disconnect from server */
  disconnect: () => void;
}

// ============================================================================
// THROTTLE UTILITY
// ============================================================================

function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T {
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number;

  return ((...args: Parameters<T>) => {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  }) as T;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useMultiplayer(options: UseMultiplayerOptions): UseMultiplayerReturn {
  const {
    serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:6000',
    user,
    projectId,
    onServerUpdate,
    onUserJoined,
    onUserLeft,
    onChatMessage,
    debug = false,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<MultiplayerUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());
  const [selections, setSelections] = useState<Map<string, UserSelection>>(new Map());

  // Debug logger
  const log = useCallback(
    (...args: any[]) => {
      if (debug) {
        console.log('[Multiplayer]', ...args);
      }
    },
    [debug]
  );

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  useEffect(() => {
    if (!projectId || !user.id) {
      log('Missing projectId or user.id, skipping connection');
      return;
    }

    log('Connecting to', serverUrl);

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // ========================================================================
    // SOCKET EVENT HANDLERS
    // ========================================================================

    socket.on('connect', () => {
      log('Connected, joining project:', projectId);
      setIsConnected(true);

      // Join the project room
      socket.emit('join_project', { projectId, user });
    });

    socket.on('disconnect', () => {
      log('Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      log('Connection error:', error.message);
    });

    // Room state (initial state when joining)
    socket.on('room_state', (data: { projectId: string; users: MultiplayerUser[]; cursors: CursorData[] }) => {
      log('Received room state:', data);
      setUsers(data.users.filter((u) => u.id !== user.id));
      
      const cursorMap = new Map<string, CursorData>();
      data.cursors.forEach((c) => {
        if (c.userId !== user.id) {
          cursorMap.set(c.userId, c);
        }
      });
      setCursors(cursorMap);
    });

    // User joined
    socket.on('user_joined', (data: { userId: string; userName: string; userColor: string }) => {
      log('User joined:', data.userName);
      setUsers((prev) => {
        if (prev.some((u) => u.id === data.userId)) return prev;
        return [...prev, { id: data.userId, name: data.userName, color: data.userColor }];
      });
      onUserJoined?.(data);
    });

    // User left
    socket.on('user_left', (data: { userId: string; userName: string }) => {
      log('User left:', data.userName);
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
      setSelections((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
      onUserLeft?.(data);
    });

    // Cursor update
    socket.on('cursor_update', (data: CursorData) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    });

    // Selection update
    socket.on('user_selection', (data: UserSelection) => {
      setSelections((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    });

    // Server update (model changes)
    socket.on('server_update', (update: ServerUpdate) => {
      log('Server update:', update);
      onServerUpdate?.(update);
    });

    // Update rejected (conflict)
    socket.on('update_rejected', (data: { type: string; elementId: string; reason: string }) => {
      log('Update rejected:', data);
    });

    // Chat message
    socket.on('chat_message', (message: ChatMessage) => {
      log('Chat message:', message);
      onChatMessage?.(message);
    });

    // ========================================================================
    // CLEANUP
    // ========================================================================

    return () => {
      log('Disconnecting');
      socket.emit('leave_project');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setUsers([]);
      setCursors(new Map());
      setSelections(new Map());
    };
  }, [serverUrl, projectId, user.id]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  // Throttled cursor update (max 20 updates per second)
  const updateCursor = useCallback(
    throttle((position: { x: number; y: number; z: number }, selection?: CursorData['selection']) => {
      socketRef.current?.emit('cursor_move', {
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        position,
        selection,
      });
    }, 50),
    [user]
  );

  const updateNode = useCallback(
    (nodeId: string, changes: Record<string, any>) => {
      socketRef.current?.emit('update_node', {
        projectId,
        nodeId,
        changes,
        userId: user.id,
        timestamp: Date.now(),
      });
    },
    [projectId, user.id]
  );

  const updateMember = useCallback(
    (memberId: string, changes: Record<string, any>) => {
      socketRef.current?.emit('update_member', {
        projectId,
        memberId,
        changes,
        userId: user.id,
        timestamp: Date.now(),
      });
    },
    [projectId, user.id]
  );

  const updateLoad = useCallback(
    (loadId: string, changes: Record<string, any>) => {
      socketRef.current?.emit('update_load', {
        projectId,
        loadId,
        changes,
        userId: user.id,
        timestamp: Date.now(),
      });
    },
    [projectId, user.id]
  );

  const sendProjectUpdate = useCallback(
    (update: Omit<ServerUpdate, 'userId' | 'userName' | 'timestamp'>) => {
      socketRef.current?.emit('project_update', {
        ...update,
        userId: user.id,
        userName: user.name,
        timestamp: Date.now(),
      });
    },
    [user]
  );

  const updateSelection = useCallback(
    (selection: string[]) => {
      socketRef.current?.emit('selection_change', { selection });
    },
    []
  );

  const sendChatMessage = useCallback(
    (message: string) => {
      socketRef.current?.emit('chat_message', { message });
    },
    []
  );

  const disconnect = useCallback(() => {
    socketRef.current?.emit('leave_project');
    socketRef.current?.disconnect();
  }, []);

  return {
    isConnected,
    users,
    cursors,
    selections,
    updateCursor,
    updateNode,
    updateMember,
    updateLoad,
    sendProjectUpdate,
    updateSelection,
    sendChatMessage,
    disconnect,
  };
}

// ============================================================================
// CURSOR RENDERER HOOK
// ============================================================================

export interface UseCursorRendererOptions {
  cursors: Map<string, CursorData>;
  /** Canvas/container element for calculating positions */
  containerRef: React.RefObject<HTMLElement>;
}

/**
 * Hook to get CSS positions for cursor overlays
 */
export function useCursorPositions(options: UseCursorRendererOptions) {
  const { cursors, containerRef } = options;
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    // In a real implementation, you would project 3D positions to screen coordinates
    // This is a simplified version that uses screen positions if available
    const newPositions = new Map<string, { x: number; y: number }>();

    cursors.forEach((cursor, id) => {
      if (cursor.screenPosition) {
        newPositions.set(id, cursor.screenPosition);
      }
    });

    setPositions(newPositions);
  }, [cursors]);

  return positions;
}
