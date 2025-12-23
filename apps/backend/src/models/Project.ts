/**
 * Project.ts
 * 
 * Mongoose schema for structural analysis projects.
 * Stores project metadata, model data, and analysis results.
 */

import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const projectSchema = new Schema(
  {
    // Project owner (User ID)
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Project name
    name: {
      type: String,
      required: true,
    },

    // Project description
    description: String,

    // Thumbnail image URL (for project card preview)
    thumbnail: String,

    // Complete project data (JSON: nodes, members, loads, etc.)
    data: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },

    // Analysis results
    results: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // Project tags/categories
    tags: {
      type: [String],
      default: [],
    },

    // Is project public/shared
    isPublic: {
      type: Boolean,
      default: false,
    },

    // Shared with users (array of User IDs with read/write permissions)
    sharedWith: {
      type: [
        {
          userId: Schema.Types.ObjectId,
          permission: {
            type: String,
            enum: ['read', 'write'],
            default: 'read',
          },
        },
      ],
      default: [],
    },

    // Last analyzed at
    lastAnalyzedAt: Date,

    // Number of times project has been analyzed
    analysisCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt, updatedAt
  }
);

// Create indexes for common queries
projectSchema.index({ userId: 1 });
projectSchema.index({ name: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ isPublic: 1 });

/**
 * TypeScript interface for Project document
 */
export interface ProjectDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  thumbnail?: string;
  data: any;
  results?: any;
  tags: string[];
  isPublic: boolean;
  sharedWith: Array<{
    userId: mongoose.Types.ObjectId;
    permission: 'read' | 'write';
  }>;
  lastAnalyzedAt?: Date;
  analysisCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const ProjectModel = mongoose.model<ProjectDocument>('Project', projectSchema);
