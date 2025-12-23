// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';

export interface TemplateSummary {
  id: string;
  name: string;
  category?: string;
  description?: string;
  nodeCount: number;
  memberCount: number;
}

export interface TemplateDetail extends TemplateSummary {
  nodes: Array<{ id: string; x: number; y: number; z: number; support?: string }>;
  members: Array<{ id: string; startNode: string; endNode: string; section?: string }>;
  loads?: Array<{ type: string; memberId?: string; nodeId?: string; value: number }>;
}

export function useTemplates(apiBase = 'http://localhost:6000') {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selected, setSelected] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/templates`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load templates');
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const fetchTemplate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/templates/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load template');
      setSelected({ ...data.template, id });
    } catch (err: any) {
      setError(err?.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    selected,
    loading,
    error,
    refresh: fetchTemplates,
    selectTemplate: fetchTemplate,
  };
}
