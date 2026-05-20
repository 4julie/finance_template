// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import {
  computeAttachmentSize,
  createNote,
  findAttachmentsByNote,
  findNoteById,
  findNotesByTransaction,
  removeAttachment,
  removeNote,
  updateNote,
} from '../notes';
import { resolveFieldMerge, resolveLastWriteWins } from '../storage-model';
import { searchNotes } from '../search';
import type { AttachmentMetadata, TransactionNote } from '../types';

const makeNote = (overrides: Partial<TransactionNote> = {}): TransactionNote => ({
  id: 'note-1',
  transactionId: 'txn-1',
  text: 'Grocery receipt',
  authorId: 'user-1',
  tags: ['receipt'],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

const makeAttachment = (overrides: Partial<AttachmentMetadata> = {}): AttachmentMetadata => ({
  id: 'att-1',
  noteId: 'note-1',
  fileType: 'image/jpeg',
  sizeBytes: 150000,
  storageRef: 'uploads/att-1.jpg',
  thumbnailRef: 'uploads/att-1-thumb.jpg',
  fileName: 'receipt.jpg',
  uploadedAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

describe('createNote', () => {
  it('creates a note with all fields', () => {
    const note = createNote(
      { transactionId: 'txn-1', text: 'Test', authorId: 'user-1', tags: ['business'] },
      () => 'generated-id',
    );

    expect(note.id).toBe('generated-id');
    expect(note.transactionId).toBe('txn-1');
    expect(note.text).toBe('Test');
    expect(note.authorId).toBe('user-1');
    expect(note.tags).toEqual(['business']);
    expect(note.createdAt).toBeTruthy();
    expect(note.updatedAt).toBeTruthy();
  });

  it('defaults to empty tags array', () => {
    const note = createNote(
      { transactionId: 'txn-1', text: 'Test', authorId: 'user-1' },
      () => 'id',
    );
    expect(note.tags).toEqual([]);
  });
});

describe('updateNote', () => {
  it('updates text and preserves other fields', () => {
    const original = makeNote();
    const updated = updateNote(original, { text: 'Updated text' });

    expect(updated.text).toBe('Updated text');
    expect(updated.id).toBe(original.id);
    expect(updated.tags).toEqual(original.tags);
    expect(updated.updatedAt).not.toBe(original.updatedAt);
  });

  it('updates tags', () => {
    const updated = updateNote(makeNote(), { tags: ['business', 'travel'] });
    expect(updated.tags).toEqual(['business', 'travel']);
  });
});

describe('findNoteById', () => {
  it('finds existing note', () => {
    const notes = [makeNote({ id: 'a' }), makeNote({ id: 'b' })];
    expect(findNoteById(notes, 'b')?.id).toBe('b');
  });

  it('returns undefined for missing note', () => {
    expect(findNoteById([makeNote()], 'missing')).toBeUndefined();
  });
});

describe('findNotesByTransaction', () => {
  it('filters by transaction ID', () => {
    const notes = [
      makeNote({ id: '1', transactionId: 'txn-1' }),
      makeNote({ id: '2', transactionId: 'txn-2' }),
      makeNote({ id: '3', transactionId: 'txn-1' }),
    ];
    const result = findNotesByTransaction(notes, 'txn-1');
    expect(result).toHaveLength(2);
  });
});

describe('removeNote', () => {
  it('removes note by ID', () => {
    const notes = [makeNote({ id: 'a' }), makeNote({ id: 'b' })];
    const result = removeNote(notes, 'a');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });
});

describe('attachment helpers', () => {
  const attachments = [
    makeAttachment({ id: 'a1', noteId: 'note-1', sizeBytes: 100000 }),
    makeAttachment({ id: 'a2', noteId: 'note-1', sizeBytes: 200000 }),
    makeAttachment({ id: 'a3', noteId: 'note-2', sizeBytes: 50000 }),
  ];

  it('finds attachments by note', () => {
    expect(findAttachmentsByNote(attachments, 'note-1')).toHaveLength(2);
  });

  it('removes attachment by ID', () => {
    const result = removeAttachment(attachments, 'a2');
    expect(result).toHaveLength(2);
    expect(result.find((a) => a.id === 'a2')).toBeUndefined();
  });

  it('computes total size for a note', () => {
    expect(computeAttachmentSize(attachments, 'note-1')).toBe(300000);
  });
});

describe('search', () => {
  const notes = [
    makeNote({
      id: '1',
      text: 'Grocery store receipt',
      tags: ['receipt', 'food'],
      createdAt: '2024-01-15T10:00:00.000Z',
    }),
    makeNote({
      id: '2',
      text: 'Business lunch expense',
      tags: ['business'],
      createdAt: '2024-02-10T10:00:00.000Z',
    }),
    makeNote({
      id: '3',
      text: 'Gas station fill-up',
      tags: ['transport'],
      createdAt: '2024-03-01T10:00:00.000Z',
    }),
  ];

  it('searches by keyword', () => {
    const results = searchNotes(notes, { keyword: 'grocery' });
    expect(results).toHaveLength(1);
    expect(results[0].note.id).toBe('1');
  });

  it('filters by tags', () => {
    const results = searchNotes(notes, { tags: ['business'] });
    expect(results).toHaveLength(1);
    expect(results[0].note.id).toBe('2');
  });

  it('filters by date range', () => {
    const results = searchNotes(notes, {
      dateFrom: '2024-02-01T00:00:00.000Z',
      dateTo: '2024-02-28T23:59:59.000Z',
    });
    expect(results).toHaveLength(1);
    expect(results[0].note.id).toBe('2');
  });

  it('returns all notes when no filters', () => {
    const results = searchNotes(notes, {});
    expect(results).toHaveLength(3);
  });
});

describe('conflict resolution', () => {
  const local = makeNote({
    id: 'note-1',
    text: 'Local edit',
    tags: ['receipt'],
    updatedAt: '2024-01-15T12:00:00.000Z',
  });

  const remote = makeNote({
    id: 'note-1',
    text: 'Remote edit',
    tags: ['business'],
    updatedAt: '2024-01-15T11:00:00.000Z',
  });

  describe('resolveLastWriteWins', () => {
    it('picks local when local is newer', () => {
      const result = resolveLastWriteWins(local, remote);
      expect(result.resolved.text).toBe('Local edit');
      expect(result.hadConflict).toBe(true);
      expect(result.strategy).toBe('last-write-wins');
    });

    it('picks remote when remote is newer', () => {
      const newerRemote = { ...remote, updatedAt: '2024-01-15T13:00:00.000Z' };
      const result = resolveLastWriteWins(local, newerRemote);
      expect(result.resolved.text).toBe('Remote edit');
    });

    it('reports no conflict when timestamps match', () => {
      const same = { ...remote, updatedAt: local.updatedAt };
      const result = resolveLastWriteWins(local, same);
      expect(result.hadConflict).toBe(false);
    });
  });

  describe('resolveFieldMerge', () => {
    it('merges tags as union', () => {
      const result = resolveFieldMerge(local, remote);
      expect(result.resolved.tags).toEqual(['business', 'receipt']);
      expect(result.hadConflict).toBe(true);
    });

    it('uses last-write-wins for text', () => {
      const result = resolveFieldMerge(local, remote);
      expect(result.resolved.text).toBe('Local edit'); // local is newer
    });

    it('uses the latest updatedAt', () => {
      const result = resolveFieldMerge(local, remote);
      expect(result.resolved.updatedAt).toBe(local.updatedAt);
    });

    it('reports no conflict when identical', () => {
      const result = resolveFieldMerge(local, local);
      expect(result.hadConflict).toBe(false);
    });
  });
});
