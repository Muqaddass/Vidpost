// Minimal mock Supabase client that mimics the chainable PostgrestBuilder
// surface area the dashboard pages actually use:
//   .from(table).select(...).eq(...).order(...).limit(...) → await → { data, error, count }
//   .auth.getUser() → { data: { user } }
//
// Active when MOCK_MODE=1. Lets the UI render without a real Supabase project.

import {
  MOCK_ACCOUNTS,
  MOCK_POSTS,
  MOCK_POST_RESULTS,
  MOCK_USER,
} from "./data";

export function isMockMode(): boolean {
  return process.env.MOCK_MODE === "1";
}

function dataForTable(table: string): unknown[] {
  switch (table) {
    case "connected_accounts":
      return MOCK_ACCOUNTS;
    case "posts":
      return MOCK_POSTS;
    case "post_results":
      return MOCK_POST_RESULTS;
    default:
      return [];
  }
}

class MockBuilder<T> implements PromiseLike<{ data: T[]; error: null; count: number | null }> {
  private wantCount = false;
  private headOnly = false;

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: "exact" | null; head?: boolean }) {
    if (opts?.count === "exact") this.wantCount = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }
  // All filter/order/limit operators are no-ops in mock mode — we just return the full fixture.
  eq(_col: string, _val: unknown) { return this; }
  in(_col: string, _vals: unknown[]) { return this; }
  not(_col: string, _op: string, _val: unknown) { return this; }
  lt(_col: string, _val: unknown) { return this; }
  gt(_col: string, _val: unknown) { return this; }
  order(_col: string, _opts?: unknown) { return this; }
  limit(_n: number) { return this; }
  single() { return this; }
  upsert(_v: unknown) { return this; }
  insert(_v: unknown) { return this; }
  update(_v: unknown) { return this; }
  delete() { return this; }

  then<R1 = { data: T[]; error: null; count: number | null }, R2 = never>(
    onfulfilled?: ((value: { data: T[]; error: null; count: number | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    const data = dataForTable(this.table) as T[];
    const payload = {
      data: this.headOnly ? ([] as T[]) : data,
      error: null,
      count: this.wantCount ? data.length : null,
    };
    return Promise.resolve(payload).then(onfulfilled, onrejected);
  }
}

export function createMockSupabaseClient() {
  return {
    auth: {
      async getUser() {
        return { data: { user: MOCK_USER }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
    from(table: string) {
      return new MockBuilder(table);
    },
  };
}
