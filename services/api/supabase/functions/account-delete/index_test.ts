// SPDX-License-Identifier: BUSL-1.1

import { assert, assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { createAdminClient } from '../_shared/auth.ts';
import { createAccountDeleteHandler } from './index.ts';

type AdminClient = ReturnType<typeof createAdminClient>;

Deno.test('account-delete returns 405 for non-POST requests', async () => {
  withEnv();
  const handler = createAccountDeleteHandler({
    createClient: () => createFakeSupabase().client as unknown as AdminClient,
  });

  const response = await handler(new Request('http://localhost/functions/v1/account-delete'));

  assertEquals(response.status, 405);
});

Deno.test('account-delete requires authentication before deleting anything', async () => {
  withEnv();
  const fake = createFakeSupabase();
  const handler = createAccountDeleteHandler({
    createClient: () => fake.client as unknown as AdminClient,
  });

  const response = await handler(
    new Request('http://localhost/functions/v1/account-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE' }),
    }),
  );

  assertEquals(response.status, 401);
  assertEquals(fake.operations.length, 0);
  assertEquals(fake.deletedAuthUser, null);
});

Deno.test('account-delete cascades sole-household data before deleting auth user', async () => {
  withEnv();
  const fake = createFakeSupabase();
  const handler = createAccountDeleteHandler({
    createClient: () => fake.client as unknown as AdminClient,
  });

  const response = await handler(
    new Request('http://localhost/functions/v1/account-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer access-token',
      },
      body: JSON.stringify({ confirmation: 'DELETE' }),
    }),
  );

  assertEquals(response.status, 204);
  assert(fake.operations.some((op) => op === 'rpc:destroy_user_encryption_keys'));
  assert(fake.operations.some((op) => op === 'rpc:destroy_household_encryption_keys'));
  assert(fake.operations.indexOf('delete:transactions') < fake.operations.indexOf('delete:users'));
  assert(
    fake.operations.indexOf('delete:users') < fake.operations.indexOf('auth.deleteUser:user-1'),
  );
  assertEquals(fake.deletedAuthUser, 'user-1');
  assert(response.headers.get('Set-Cookie')?.includes('finance_refresh='));
});

function withEnv(): void {
  Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
  Deno.env.set('SUPABASE_ANON_KEY', 'anon');
}

interface FakeState {
  operations: string[];
  deletedAuthUser: string | null;
}

interface FakeClient {
  auth: {
    getUser: (
      token: string,
    ) => Promise<{ data: { user: { id: string; email: string } }; error: null }>;
    admin: { deleteUser: (userId: string) => Promise<{ error: null }> };
  };
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown[]; error: null }>;
  from: (table: string) => FakeQuery;
}

function createFakeSupabase(): FakeState & { client: FakeClient } {
  const state: FakeState = { operations: [], deletedAuthUser: null };
  const client = {
    auth: {
      getUser: (_token: string) =>
        Promise.resolve({
          data: { user: { id: 'user-1', email: 'alex@example.com' } },
          error: null,
        }),
      admin: {
        deleteUser: (userId: string) => {
          state.deletedAuthUser = userId;
          state.operations.push(`auth.deleteUser:${userId}`);
          return Promise.resolve({ error: null });
        },
      },
    },
    rpc: (name: string, _args: Record<string, unknown>) => {
      state.operations.push(`rpc:${name}`);
      return Promise.resolve({ data: [], error: null });
    },
    from: (table: string) => new FakeQuery(table, state),
  };
  return {
    operations: state.operations,
    get deletedAuthUser() {
      return state.deletedAuthUser;
    },
    client,
  };
}

class FakeQuery {
  private op: 'select' | 'delete' | 'update' | null = null;
  private filters = new Map<string, unknown>();

  constructor(
    private readonly table: string,
    private readonly state: FakeState,
  ) {}

  select(_columns?: string): this {
    this.op = 'select';
    return this;
  }

  delete(): this {
    this.op = 'delete';
    this.state.operations.push(`delete:${this.table}`);
    return this;
  }

  update(_values: Record<string, unknown>): this {
    this.op = 'update';
    this.state.operations.push(`update:${this.table}`);
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.set(column, value);
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.set(`neq:${column}`, value);
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.set(`is:${column}`, value);
    return this;
  }

  in(column: string, value: unknown): this {
    this.filters.set(`in:${column}`, value);
    return this;
  }

  or(_filter: string): this {
    return this;
  }

  then(resolve: (value: { data: unknown[]; error: null }) => void): void {
    resolve({ data: this.resolveData(), error: null });
  }

  private resolveData(): unknown[] {
    if (this.op !== 'select') return [];
    if (this.table === 'household_members' && this.filters.get('user_id') === 'user-1') {
      return [{ household_id: 'household-1' }];
    }
    if (this.table === 'household_members' && this.filters.get('household_id') === 'household-1') {
      return [];
    }
    if (this.table === 'households') {
      return [{ id: 'household-1', created_by: 'user-1' }];
    }
    return [];
  }
}
