'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type SourceKind = 'website' | 'blog' | 'newsletter' | 'source';

type SourceWatchItem = {
  id: string;
  url: string;
  domain: string;
  label: string;
  kind: SourceKind;
  isActive: boolean;
  checkIntervalHours: number;
  lastCheckedAt: string | null;
};

type SourceWatchResponse = { items: SourceWatchItem[] };
type SourceWatchItemResponse = { item: SourceWatchItem };

type EditDraft = {
  id: string;
  url: string;
  label: string;
  kind: SourceKind;
  checkIntervalHours: number;
};

const KIND_OPTIONS: SourceKind[] = ['website', 'blog', 'newsletter', 'source'];

function formatLastChecked(value: string | null): string {
  if (!value) {
    return 'Never';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
}

export function SourceWatchlistPanel() {
  const [items, setItems] = useState<SourceWatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<SourceKind>('source');
  const [newInterval, setNewInterval] = useState(24);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/source-watch', { cache: 'no-store' });
      const body = (await response.json()) as SourceWatchResponse | { error?: string };

      if (!response.ok || !('items' in body)) {
        throw new Error('error' in body ? body.error || 'Failed to load sources' : 'Failed to load sources');
      }

      setItems(body.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load sources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleAddSource = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newUrl.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/source-watch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: newUrl.trim(),
          label: newLabel.trim() || undefined,
          kind: newKind,
          checkIntervalHours: newInterval,
          isActive: true,
        }),
      });

      const body = (await response.json()) as SourceWatchItemResponse | { error?: string };
      if (!response.ok || !('item' in body)) {
        throw new Error('error' in body ? body.error || 'Failed to add source' : 'Failed to add source');
      }

      setItems((current) => [body.item, ...current]);
      setNewUrl('');
      setNewLabel('');
      setNewKind('source');
      setNewInterval(24);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to add source');
    } finally {
      setIsSubmitting(false);
    }
  }, [newInterval, newKind, newLabel, newUrl]);

  const handleToggleActive = useCallback(async (item: SourceWatchItem) => {
    setError(null);
    try {
      const response = await fetch(`/api/source-watch/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const body = (await response.json()) as SourceWatchItemResponse | { error?: string };
      if (!response.ok || !('item' in body)) {
        throw new Error('error' in body ? body.error || 'Failed to update source' : 'Failed to update source');
      }
      setItems((current) => current.map((candidate) => (candidate.id === body.item.id ? body.item : candidate)));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update source');
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/source-watch/${id}`, { method: 'DELETE' });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error || 'Failed to delete source');
      }
      setItems((current) => current.filter((item) => item.id !== id));
      if (editDraft?.id === id) {
        setEditDraft(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete source');
    }
  }, [editDraft?.id]);

  const beginEdit = useCallback((item: SourceWatchItem) => {
    setEditDraft({
      id: item.id,
      url: item.url,
      label: item.label,
      kind: item.kind,
      checkIntervalHours: item.checkIntervalHours,
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editDraft) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/source-watch/${editDraft.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: editDraft.url.trim(),
          label: editDraft.label.trim(),
          kind: editDraft.kind,
          checkIntervalHours: editDraft.checkIntervalHours,
        }),
      });

      const body = (await response.json()) as SourceWatchItemResponse | { error?: string };
      if (!response.ok || !('item' in body)) {
        throw new Error('error' in body ? body.error || 'Failed to update source' : 'Failed to update source');
      }

      setItems((current) => current.map((item) => (item.id === body.item.id ? body.item : item)));
      setEditDraft(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update source');
    } finally {
      setIsSaving(false);
    }
  }, [editDraft]);

  return (
    <section className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Source Watchlist
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Web Scout periodically checks active sources based on each interval.
            </p>
          </div>
          <span className="text-xs text-zinc-400">
            {activeCount} active / {items.length} total
          </span>
        </div>

        <form onSubmit={handleAddSource} className="grid gap-2 sm:grid-cols-6">
          <input
            type="url"
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            placeholder="https://example.com"
            className="sm:col-span-3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40"
          />
          <input
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="Label (optional)"
            className="sm:col-span-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40"
          />
          <select
            value={newKind}
            onChange={(event) => setNewKind(event.target.value as SourceKind)}
            className="sm:col-span-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/40"
          >
            {KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={168}
            value={newInterval}
            onChange={(event) => setNewInterval(Number(event.target.value))}
            className="sm:col-span-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/40"
            title="Check interval in hours"
          />

          <button
            type="submit"
            disabled={isSubmitting || !newUrl.trim()}
            className="sm:col-span-6 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Adding...' : 'Add Source'}
          </button>
        </form>

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading sources...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No sources configured yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {items.map((item) => {
              const isEditing = editDraft?.id === item.id;
              return (
                <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                  {isEditing && editDraft ? (
                    <div className="grid gap-2 sm:grid-cols-6">
                      <input
                        type="url"
                        value={editDraft.url}
                        onChange={(event) =>
                          setEditDraft((current) =>
                            current ? { ...current, url: event.target.value } : current
                          )
                        }
                        className="sm:col-span-3 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/40"
                      />
                      <input
                        value={editDraft.label}
                        onChange={(event) =>
                          setEditDraft((current) =>
                            current ? { ...current, label: event.target.value } : current
                          )
                        }
                        className="sm:col-span-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/40"
                      />
                      <select
                        value={editDraft.kind}
                        onChange={(event) =>
                          setEditDraft((current) =>
                            current ? { ...current, kind: event.target.value as SourceKind } : current
                          )
                        }
                        className="sm:col-span-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/40"
                      >
                        {KIND_OPTIONS.map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={editDraft.checkIntervalHours}
                        onChange={(event) =>
                          setEditDraft((current) =>
                            current
                              ? { ...current, checkIntervalHours: Number(event.target.value) }
                              : current
                          )
                        }
                        className="sm:col-span-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-white/40"
                      />
                      <div className="sm:col-span-6 flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditDraft(null)}
                          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleSaveEdit();
                          }}
                          disabled={isSaving || !editDraft.url.trim()}
                          className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-colors disabled:opacity-60"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {item.label} <span className="text-zinc-500">({item.kind})</span>
                        </p>
                        <p className="text-xs text-zinc-400 truncate">{item.url}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Every {item.checkIntervalHours}h · Last checked: {formatLastChecked(item.lastCheckedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            void handleToggleActive(item);
                          }}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            item.isActive
                              ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => beginEdit(item)}
                          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDelete(item.id);
                          }}
                          className="rounded-md border border-red-500/40 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
