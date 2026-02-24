'use client';

import { useState, useEffect, useCallback } from 'react';
import { FirmTemplate } from '@/types/report';
import {
  subscribeToFirmTemplates,
  createFirmTemplate,
  updateFirmTemplate,
  deleteFirmTemplate,
} from '@/lib/firestore';

interface UseFirmTemplatesResult {
  templates: FirmTemplate[];
  loading: boolean;
  create: (template: Omit<FirmTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (templateId: string, updates: Partial<Omit<FirmTemplate, 'id' | 'createdAt' | 'createdBy'>>) => Promise<void>;
  remove: (templateId: string) => Promise<void>;
}

export function useFirmTemplates(firmId: string | null, userId: string | null): UseFirmTemplatesResult {
  const [templates, setTemplates] = useState<FirmTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firmId) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToFirmTemplates(firmId, (updated) => {
      setTemplates(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [firmId]);

  const create = useCallback(
    async (template: Omit<FirmTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      if (!firmId || !userId) throw new Error('Must be signed in to create templates');
      return createFirmTemplate(firmId, template, userId);
    },
    [firmId, userId]
  );

  const update = useCallback(
    async (templateId: string, updates: Partial<Omit<FirmTemplate, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> => {
      if (!firmId) throw new Error('Must be signed in to update templates');
      return updateFirmTemplate(firmId, templateId, updates);
    },
    [firmId]
  );

  const remove = useCallback(
    async (templateId: string): Promise<void> => {
      if (!firmId) throw new Error('Must be signed in to delete templates');
      return deleteFirmTemplate(firmId, templateId);
    },
    [firmId]
  );

  return { templates, loading, create, update, remove };
}
