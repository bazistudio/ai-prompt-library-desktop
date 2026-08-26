import { TextDirection } from "@/components/editor/languageDetector";

export interface PromptDraft {
  content: string;
  language: string;
  direction: TextDirection;
  title?: string;
  description?: string;
  category?: string;
  projectId?: string;
  tags?: string[];
  lastUpdated: number;
}

let activeDraft: PromptDraft | null = null;

export const promptDraftStore = {
  getDraft(): PromptDraft | null {
    return activeDraft;
  },

  setDraft(draft: Partial<PromptDraft> & { content: string }) {
    activeDraft = {
      content: draft.content,
      language: draft.language || "en",
      direction: draft.direction || "ltr",
      title: draft.title,
      description: draft.description,
      category: draft.category,
      projectId: draft.projectId,
      tags: draft.tags,
      lastUpdated: Date.now(),
    };
  },

  clearDraft() {
    activeDraft = null;
  },

  hasDraft(): boolean {
    return Boolean(activeDraft && activeDraft.content && activeDraft.content.trim().length > 0);
  },
};
