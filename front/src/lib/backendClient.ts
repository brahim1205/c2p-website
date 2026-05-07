import { apiRequest, toApiError, type ApiError } from './api';

type RealtimeCallback = (payload: { new?: unknown; old?: unknown }) => void;
type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface ChannelListener {
  event: RealtimeEvent;
  table?: string;
  filter?: string;
  callback: RealtimeCallback;
}

interface QueryResponse<T> {
  data: T | null;
  error: ApiError | null;
}

const realtimeListeners = new Set<ChannelListener>();

function matchRealtimeFilter(row: unknown, filter?: string) {
  if (!filter) return true;
  if (!row || typeof row !== 'object') return false;

  const match = /^([^=]+)=eq\.(.+)$/.exec(filter);
  if (!match) return true;

  const [, field, expected] = match;
  return String((row as Record<string, unknown>)[field]) === expected;
}

function emitRealtime(event: RealtimeEvent, table: string, payload: { new?: unknown; old?: unknown }) {
  for (const listener of realtimeListeners) {
    if (listener.event !== event) continue;
    if (listener.table && listener.table !== table) continue;
    const targetRow = payload.new ?? payload.old;
    if (!matchRealtimeFilter(targetRow, listener.filter)) continue;
    listener.callback(payload);
  }
}

function asRows<T>(data: T | T[] | null | undefined): T[] {
  if (data === null || data === undefined) return [];
  return Array.isArray(data) ? data : [data];
}

class BackendQuery<T = any> implements PromiseLike<QueryResponse<T[]>> {
  private filters: Record<string, string> = {};
  private orderField?: string;
  private ascending?: boolean;
  private rowLimit?: number;
  private singleResult = false;
  private table: string;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns = '*') {
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters[`eq_${field}`] = String(value);
    return this;
  }

  neq(field: string, value: unknown) {
    this.filters[`neq_${field}`] = String(value);
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filters[`in_${field}`] = values.map(String).join(',');
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.ascending = options?.ascending;
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  single(): Promise<QueryResponse<T>> {
    this.singleResult = true;
    return this.executeSingle();
  }

  maybeSingle(): Promise<QueryResponse<T>> {
    return this.single();
  }

  insert(payload: unknown): BackendMutation<T> {
    return new BackendMutation<T>(this.table, 'POST', payload);
  }

  update(payload: unknown): BackendMutation<T> {
    return new BackendMutation<T>(this.table, 'PATCH', payload);
  }

  delete(): BackendMutation<T> {
    return new BackendMutation<T>(this.table, 'DELETE');
  }

  then<TResult1 = QueryResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private queryString(extra: Record<string, string> = {}) {
    const params = new URLSearchParams({ ...this.filters, ...extra });
    if (this.orderField) params.set('order', this.orderField);
    if (this.ascending !== undefined) params.set('ascending', String(this.ascending));
    if (this.rowLimit !== undefined) params.set('limit', String(this.rowLimit));
    if (this.singleResult) params.set('single', 'true');
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  private async execute(): Promise<QueryResponse<T[]>> {
    try {
      const data = await apiRequest<T[]>(`/data/${this.table}${this.queryString()}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: toApiError(error) };
    }
  }

  private async executeSingle(): Promise<QueryResponse<T>> {
    try {
      const data = await apiRequest<T>(`/data/${this.table}${this.queryString({ single: 'true' })}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: toApiError(error) };
    }
  }

}

class BackendMutation<T = any> implements PromiseLike<QueryResponse<T>> {
  private filters: Record<string, string> = {};
  private table: string;
  private method: 'POST' | 'PATCH' | 'DELETE';
  private payload?: unknown;

  constructor(
    table: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    payload?: unknown,
  ) {
    this.table = table;
    this.method = method;
    this.payload = payload;
  }

  eq(field: string, value: unknown) {
    this.filters[`eq_${field}`] = String(value);
    return this;
  }

  neq(field: string, value: unknown) {
    this.filters[`neq_${field}`] = String(value);
    return this;
  }

  select(_columns = '*') {
    return this;
  }

  single(): Promise<QueryResponse<T>> {
    return this.execute();
  }

  then<TResult1 = QueryResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private queryString() {
    const params = new URLSearchParams(this.filters);
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  private async execute(): Promise<QueryResponse<T>> {
    try {
      const data = await apiRequest<T>(`/data/${this.table}${this.queryString()}`, {
        method: this.method,
        body: this.payload === undefined ? undefined : JSON.stringify(this.payload),
      });

      const rows = asRows(data);
      if (this.method === 'POST') {
        rows.forEach((row) => emitRealtime('INSERT', this.table, { new: row }));
      } else if (this.method === 'PATCH') {
        rows.forEach((row) => emitRealtime('UPDATE', this.table, { new: row }));
      } else if (this.method === 'DELETE') {
        rows.forEach((row) => emitRealtime('DELETE', this.table, { old: row }));
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: toApiError(error) };
    }
  }
}

export function createBackendClient() {
  return {
    from: <T = any>(table: string) => new BackendQuery<T>(table),
    channel: (_name: string) => {
      const listeners: ChannelListener[] = [];
      let subscribed = false;

      const channel = {
        on: (_event: string, options: { event?: string; schema?: string; table?: string; filter?: string }, callback: RealtimeCallback) => {
          listeners.push({
            event: (options.event as RealtimeEvent) || 'INSERT',
            table: options.table,
            filter: options.filter,
            callback,
          });
          return channel;
        },
        subscribe: () => {
          if (!subscribed) {
            listeners.forEach((listener) => realtimeListeners.add(listener));
            subscribed = true;
          }
          return channel;
        },
        unsubscribe: () => {
          listeners.forEach((listener) => realtimeListeners.delete(listener));
          subscribed = false;
        },
      };

      return channel;
    },
    removeChannel: (channel: { unsubscribe?: () => void }) => {
      channel?.unsubscribe?.();
    },
    storage: {
      from: (_bucket: string) => ({
        upload: async (_path: string, _file: File, _options?: unknown) => ({ data: null, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      }),
    },
  };
}

export const backendClient = createBackendClient();
