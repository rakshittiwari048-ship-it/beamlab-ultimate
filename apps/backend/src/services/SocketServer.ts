/**
 * SocketServer.ts
 * 
 * Real-time collaboration server using Socket.IO
 * 
 * Features:
 * - Project-based rooms for isolated collaboration
 * - Node/Member/Load update broadcasting
 * - Cursor position tracking for multi-user awareness
 * - User presence tracking (join/leave notifications)
 * - Last-write-wins conflict resolution
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

// ============================================================================
// INTERFACES
// ============================================================================

export interface User {
  id: string;
  name: string;
  email?: string;
  color: string;
  avatar?: string;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  userColor: string;
  /** 3D world position */
  position: { x: number; y: number; z: number };
  /** Screen position for 2D overlays */
  screenPosition?: { x: number; y: number };
  /** Currently selected element */
  selection?: {
    type: 'node' | 'member' | 'load';
    id: string;
  };
  timestamp: number;
}

export interface NodeUpdate {
  projectId: string;
  nodeId: string;
  changes: Partial<{
    x: number;
    y: number;
    z: number;
    label: string;
    supportType: string;
  }>;
  userId: string;
  timestamp: number;
}

export interface MemberUpdate {
  projectId: string;
  memberId: string;
  changes: Partial<{
    startNodeId: string;
    endNodeId: string;
    sectionId: string;
    materialId: string;
    releases: any;
  }>;
  userId: string;
  timestamp: number;
}

export interface LoadUpdate {
  projectId: string;
  loadId: string;
  changes: Partial<{
    nodeId?: string;
    memberId?: string;
    type: string;
    value: number;
    direction?: { x: number; y: number; z: number };
  }>;
  userId: string;
  timestamp: number;
}

export interface ProjectUpdate {
  projectId: string;
  type: 'node' | 'member' | 'load' | 'support' | 'section' | 'material';
  action: 'create' | 'update' | 'delete';
  data: any;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface RoomState {
  projectId: string;
  users: Map<string, User>;
  cursors: Map<string, CursorPosition>;
  /** Last update timestamp for each element (for conflict resolution) */
  lastUpdates: Map<string, number>;
}

// ============================================================================
// USER COLORS
// ============================================================================

const USER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

// ============================================================================
// SOCKET SERVER CLASS
// ============================================================================

export class SocketServer {
  private io: Server;
  private rooms: Map<string, RoomState>;
  private userSockets: Map<string, string>; // socketId -> projectId

  constructor(httpServer: HttpServer, corsOrigin?: string) {
    this.io = new Server(httpServer, {
      cors: {
        origin: corsOrigin || process.env.CORS_ORIGIN || 'http://localhost:8000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.rooms = new Map();
    this.userSockets = new Map();

    this.setupEventHandlers();
    console.log('🔌 Socket.IO server initialized');
  }

  // ==========================================================================
  // ROOM MANAGEMENT
  // ==========================================================================

  private getOrCreateRoom(projectId: string): RoomState {
    if (!this.rooms.has(projectId)) {
      this.rooms.set(projectId, {
        projectId,
        users: new Map(),
        cursors: new Map(),
        lastUpdates: new Map(),
      });
    }
    return this.rooms.get(projectId)!;
  }

  private cleanupRoom(projectId: string): void {
    const room = this.rooms.get(projectId);
    if (room && room.users.size === 0) {
      this.rooms.delete(projectId);
      console.log(`🧹 Cleaned up empty room: ${projectId}`);
    }
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`👤 Client connected: ${socket.id}`);

      // ========================================================================
      // JOIN PROJECT
      // ========================================================================
      socket.on('join_project', (data: { projectId: string; user: User }) => {
        const { projectId, user } = data;
        const room = this.getOrCreateRoom(projectId);

        // Assign color if not provided
        if (!user.color) {
          user.color = getRandomColor();
        }

        // Join the room
        socket.join(projectId);
        room.users.set(socket.id, user);
        this.userSockets.set(socket.id, projectId);

        console.log(`➡️ ${user.name} joined project ${projectId}`);

        // Notify others in the room
        socket.to(projectId).emit('user_joined', {
          userId: user.id,
          userName: user.name,
          userColor: user.color,
          timestamp: Date.now(),
        });

        // Send current room state to joining user
        socket.emit('room_state', {
          projectId,
          users: Array.from(room.users.values()),
          cursors: Array.from(room.cursors.values()),
        });
      });

      // ========================================================================
      // LEAVE PROJECT
      // ========================================================================
      socket.on('leave_project', () => {
        this.handleDisconnect(socket);
      });

      // ========================================================================
      // CURSOR MOVE
      // ========================================================================
      socket.on('cursor_move', (data: Omit<CursorPosition, 'timestamp'>) => {
        const projectId = this.userSockets.get(socket.id);
        if (!projectId) return;

        const room = this.rooms.get(projectId);
        if (!room) return;

        const cursorData: CursorPosition = {
          ...data,
          timestamp: Date.now(),
        };

        room.cursors.set(socket.id, cursorData);

        // Broadcast to others in the room (throttled on client side)
        socket.to(projectId).emit('cursor_update', cursorData);
      });

      // ========================================================================
      // NODE UPDATE
      // ========================================================================
      socket.on('update_node', (data: NodeUpdate) => {
        this.handleElementUpdate(socket, 'node', data);
      });

      // ========================================================================
      // MEMBER UPDATE
      // ========================================================================
      socket.on('update_member', (data: MemberUpdate) => {
        this.handleElementUpdate(socket, 'member', data);
      });

      // ========================================================================
      // LOAD UPDATE
      // ========================================================================
      socket.on('update_load', (data: LoadUpdate) => {
        this.handleElementUpdate(socket, 'load', data);
      });

      // ========================================================================
      // GENERIC PROJECT UPDATE (for create/delete operations)
      // ========================================================================
      socket.on('project_update', (data: ProjectUpdate) => {
        const projectId = this.userSockets.get(socket.id);
        if (!projectId || projectId !== data.projectId) return;

        const room = this.rooms.get(projectId);
        if (!room) return;

        const user = room.users.get(socket.id);

        // Update timestamp for conflict resolution
        const elementKey = `${data.type}:${data.data.id || 'new'}`;
        room.lastUpdates.set(elementKey, data.timestamp);

        // Broadcast to all other clients in the room
        socket.to(projectId).emit('server_update', {
          ...data,
          userName: user?.name || 'Unknown',
          timestamp: Date.now(),
        });

        console.log(`📤 ${data.action} ${data.type} in ${projectId} by ${user?.name}`);
      });

      // ========================================================================
      // SELECTION CHANGE
      // ========================================================================
      socket.on('selection_change', (data: { selection: string[] }) => {
        const projectId = this.userSockets.get(socket.id);
        if (!projectId) return;

        const room = this.rooms.get(projectId);
        if (!room) return;

        const user = room.users.get(socket.id);

        socket.to(projectId).emit('user_selection', {
          userId: user?.id,
          userName: user?.name,
          userColor: user?.color,
          selection: data.selection,
          timestamp: Date.now(),
        });
      });

      // ========================================================================
      // CHAT MESSAGE
      // ========================================================================
      socket.on('chat_message', (data: { message: string }) => {
        const projectId = this.userSockets.get(socket.id);
        if (!projectId) return;

        const room = this.rooms.get(projectId);
        if (!room) return;

        const user = room.users.get(socket.id);

        this.io.to(projectId).emit('chat_message', {
          userId: user?.id,
          userName: user?.name,
          userColor: user?.color,
          message: data.message,
          timestamp: Date.now(),
        });
      });

      // ========================================================================
      // DISCONNECT
      // ========================================================================
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // ==========================================================================
  // ELEMENT UPDATE HANDLER (with conflict resolution)
  // ==========================================================================

  private handleElementUpdate(
    socket: Socket,
    type: 'node' | 'member' | 'load',
    data: NodeUpdate | MemberUpdate | LoadUpdate
  ): void {
    const projectId = this.userSockets.get(socket.id);
    if (!projectId || projectId !== data.projectId) return;

    const room = this.rooms.get(projectId);
    if (!room) return;

    const user = room.users.get(socket.id);
    const elementKey = `${type}:${(data as any)[`${type}Id`] || (data as any).nodeId || (data as any).memberId || (data as any).loadId}`;
    const lastUpdate = room.lastUpdates.get(elementKey) || 0;

    // Last-write-wins conflict resolution
    if (data.timestamp <= lastUpdate) {
      console.log(`⚠️ Stale update rejected for ${elementKey}`);
      socket.emit('update_rejected', {
        type,
        elementId: elementKey,
        reason: 'stale_update',
        serverTimestamp: lastUpdate,
      });
      return;
    }

    // Update timestamp
    room.lastUpdates.set(elementKey, data.timestamp);

    // Broadcast to all other clients
    socket.to(projectId).emit('server_update', {
      projectId,
      type,
      action: 'update',
      data: {
        id: (data as any).nodeId || (data as any).memberId || (data as any).loadId,
        changes: (data as any).changes,
      },
      userId: data.userId,
      userName: user?.name || 'Unknown',
      timestamp: data.timestamp,
    });

    console.log(`📤 Update ${type} in ${projectId} by ${user?.name}`);
  }

  // ==========================================================================
  // DISCONNECT HANDLER
  // ==========================================================================

  private handleDisconnect(socket: Socket): void {
    const projectId = this.userSockets.get(socket.id);
    if (!projectId) return;

    const room = this.rooms.get(projectId);
    if (!room) return;

    const user = room.users.get(socket.id);

    // Remove user from room
    room.users.delete(socket.id);
    room.cursors.delete(socket.id);
    this.userSockets.delete(socket.id);

    // Notify others
    if (user) {
      socket.to(projectId).emit('user_left', {
        userId: user.id,
        userName: user.name,
        timestamp: Date.now(),
      });
      console.log(`⬅️ ${user.name} left project ${projectId}`);
    }

    // Cleanup empty rooms
    this.cleanupRoom(projectId);

    console.log(`👋 Client disconnected: ${socket.id}`);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get all users in a project room
   */
  getRoomUsers(projectId: string): User[] {
    const room = this.rooms.get(projectId);
    return room ? Array.from(room.users.values()) : [];
  }

  /**
   * Broadcast a message to all users in a project
   */
  broadcastToProject(projectId: string, event: string, data: any): void {
    this.io.to(projectId).emit(event, data);
  }

  /**
   * Get the Socket.IO server instance
   */
  getIO(): Server {
    return this.io;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let socketServerInstance: SocketServer | null = null;

export function createSocketServer(httpServer: HttpServer, corsOrigin?: string): SocketServer {
  if (!socketServerInstance) {
    socketServerInstance = new SocketServer(httpServer, corsOrigin);
  }
  return socketServerInstance;
}

export function getSocketServer(): SocketServer | null {
  return socketServerInstance;
}
