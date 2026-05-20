// SPDX-License-Identifier: BUSL-1.1

/**
 * Transaction notes CRUD operations and utilities.
 *
 * Pure functions for creating, updating, and managing transaction
 * notes and attachment metadata. No database access — operates on
 * in-memory data structures.
 *
 * References: #1626
 */

import type {
  AttachmentMetadata,
  CreateNoteInput,
  TransactionNote,
  UpdateNoteInput,
} from './types';

// ---------------------------------------------------------------------------
// Note CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new transaction note.
 *
 * @param input - Note creation input.
 * @param idGenerator - Optional ID generator (defaults to crypto.randomUUID).
 * @returns A new TransactionNote.
 */
export function createNote(
  input: CreateNoteInput,
  idGenerator: () => string = () => crypto.randomUUID(),
): TransactionNote {
  const now = new Date().toISOString();
  return {
    id: idGenerator(),
    transactionId: input.transactionId,
    text: input.text,
    authorId: input.authorId,
    tags: input.tags ? [...input.tags] : [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Updates an existing note with partial changes.
 *
 * Returns a new note object with updated fields and a fresh updatedAt.
 *
 * @param note - The existing note.
 * @param updates - Partial updates to apply.
 * @returns Updated TransactionNote.
 */
export function updateNote(note: TransactionNote, updates: UpdateNoteInput): TransactionNote {
  return {
    ...note,
    text: updates.text ?? note.text,
    tags: updates.tags ? [...updates.tags] : note.tags,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Finds a note by ID in a collection.
 *
 * @param notes - Array of notes to search.
 * @param noteId - The note ID to find.
 * @returns The matching note, or undefined.
 */
export function findNoteById(
  notes: readonly TransactionNote[],
  noteId: string,
): TransactionNote | undefined {
  return notes.find((n) => n.id === noteId);
}

/**
 * Finds all notes for a given transaction.
 *
 * @param notes - Array of notes to search.
 * @param transactionId - The transaction ID to filter by.
 * @returns Array of matching notes.
 */
export function findNotesByTransaction(
  notes: readonly TransactionNote[],
  transactionId: string,
): TransactionNote[] {
  return notes.filter((n) => n.transactionId === transactionId);
}

/**
 * Removes a note by ID from a collection (pure — returns new array).
 *
 * @param notes - Array of notes.
 * @param noteId - ID of the note to remove.
 * @returns New array without the matching note.
 */
export function removeNote(notes: readonly TransactionNote[], noteId: string): TransactionNote[] {
  return notes.filter((n) => n.id !== noteId);
}

// ---------------------------------------------------------------------------
// Attachment Helpers
// ---------------------------------------------------------------------------

/**
 * Finds all attachments for a given note.
 *
 * @param attachments - Array of attachment metadata.
 * @param noteId - The note ID to filter by.
 * @returns Array of matching attachments.
 */
export function findAttachmentsByNote(
  attachments: readonly AttachmentMetadata[],
  noteId: string,
): AttachmentMetadata[] {
  return attachments.filter((a) => a.noteId === noteId);
}

/**
 * Removes an attachment by ID from a collection.
 *
 * @param attachments - Array of attachment metadata.
 * @param attachmentId - ID of the attachment to remove.
 * @returns New array without the matching attachment.
 */
export function removeAttachment(
  attachments: readonly AttachmentMetadata[],
  attachmentId: string,
): AttachmentMetadata[] {
  return attachments.filter((a) => a.id !== attachmentId);
}

/**
 * Computes total attachment size in bytes for a note.
 *
 * @param attachments - Array of attachment metadata.
 * @param noteId - The note ID.
 * @returns Total size in bytes.
 */
export function computeAttachmentSize(
  attachments: readonly AttachmentMetadata[],
  noteId: string,
): number {
  return findAttachmentsByNote(attachments, noteId).reduce((sum, a) => sum + a.sizeBytes, 0);
}
