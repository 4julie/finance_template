// SPDX-License-Identifier: BUSL-1.1

/**
 * Storage model interfaces and sync conflict resolution for
 * transaction notes and attachments.
 *
 * Defines abstract CRUD interfaces (NoteStorage, AttachmentStorage)
 * and implements last-write-wins with field-level merge for
 * non-conflicting fields.
 *
 * References: #1626
 */

import type {
  AttachmentMetadata,
  ConflictResolution,
  CreateNoteInput,
  TransactionNote,
  UpdateNoteInput,
} from './types';

// ---------------------------------------------------------------------------
// Storage Interfaces
// ---------------------------------------------------------------------------

/** Abstract CRUD interface for transaction notes. */
export interface NoteStorage {
  /** Get all notes for a transaction. */
  getByTransaction(transactionId: string): Promise<TransactionNote[]>;

  /** Get a single note by ID. */
  getById(noteId: string): Promise<TransactionNote | null>;

  /** Create a new note. */
  create(input: CreateNoteInput): Promise<TransactionNote>;

  /** Update an existing note. */
  update(noteId: string, updates: UpdateNoteInput): Promise<TransactionNote | null>;

  /** Delete a note by ID (soft delete). */
  delete(noteId: string): Promise<boolean>;
}

/** Abstract storage interface for note attachments. */
export interface AttachmentStorage {
  /** Get all attachments for a note. */
  getByNote(noteId: string): Promise<AttachmentMetadata[]>;

  /** Upload an attachment and return its metadata. */
  upload(
    noteId: string,
    file: {
      readonly fileName: string;
      readonly fileType: AttachmentMetadata['fileType'];
      readonly sizeBytes: number;
      readonly data: ArrayBuffer;
    },
  ): Promise<AttachmentMetadata>;

  /** Download attachment data by ID. */
  download(attachmentId: string): Promise<ArrayBuffer | null>;

  /** Delete an attachment by ID. */
  delete(attachmentId: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Conflict Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a sync conflict between a local and remote note using
 * last-write-wins strategy.
 *
 * The note with the more recent `updatedAt` timestamp wins entirely.
 *
 * @param local - The local version of the note.
 * @param remote - The remote version of the note.
 * @returns ConflictResolution with the winning note.
 */
export function resolveLastWriteWins(
  local: TransactionNote,
  remote: TransactionNote,
): ConflictResolution<TransactionNote> {
  if (local.updatedAt === remote.updatedAt) {
    return { resolved: local, strategy: 'last-write-wins', hadConflict: false };
  }

  const localWins = local.updatedAt > remote.updatedAt;
  return {
    resolved: localWins ? local : remote,
    strategy: 'last-write-wins',
    hadConflict: true,
  };
}

/**
 * Resolves a sync conflict with field-level merging for
 * non-conflicting fields.
 *
 * Strategy:
 * - `text`: last-write-wins (uses the more recently updated version)
 * - `tags`: union of both tag sets (non-conflicting merge)
 * - `authorId`, `transactionId`, `id`, `createdAt`: always from local
 * - `updatedAt`: the later of the two
 *
 * @param local - The local version of the note.
 * @param remote - The remote version of the note.
 * @returns ConflictResolution with the merged note.
 */
export function resolveFieldMerge(
  local: TransactionNote,
  remote: TransactionNote,
): ConflictResolution<TransactionNote> {
  // If identical, no conflict
  if (local.updatedAt === remote.updatedAt && local.text === remote.text) {
    return { resolved: local, strategy: 'field-merge', hadConflict: false };
  }

  const hadConflict = local.text !== remote.text || !tagsEqual(local.tags, remote.tags);

  // Text: last-write-wins
  const textWinner = local.updatedAt >= remote.updatedAt ? local : remote;

  // Tags: union merge
  const mergedTags = Array.from(new Set([...local.tags, ...remote.tags])).sort();

  // Timestamp: latest
  const latestUpdatedAt = local.updatedAt >= remote.updatedAt ? local.updatedAt : remote.updatedAt;

  const resolved: TransactionNote = {
    id: local.id,
    transactionId: local.transactionId,
    text: textWinner.text,
    authorId: local.authorId,
    tags: mergedTags,
    createdAt: local.createdAt,
    updatedAt: latestUpdatedAt,
  };

  return { resolved, strategy: 'field-merge', hadConflict };
}

/**
 * Checks if two tag arrays are equal (order-independent).
 *
 * @param a - First tag array.
 * @param b - Second tag array.
 * @returns True if both arrays contain the same tags.
 */
function tagsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
}
