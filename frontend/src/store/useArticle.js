import { create } from "zustand";
import axiosInstance from "../lib/axiosinstance.js";

export const useArticleStore = create((set, get) => ({
  article_id: null,
  translation: null,
  keywordTimeline: null,
  loadingKeywordTimeline: false,
  briefing: null,
  briefingArticleId: null,
  loadingBriefing: false,
  storyIntelligence: null,
  loadingStoryIntelligence: false,
  relatedArticleList: [],
  relatedArticles: [],
  loadingRelated: false,
  keywordData: null,
  keywordDataArticleId: null,

  setArticleId: (id) => {
    set({ article_id: id });
  },

  setbriefing: (briefing) => {
    set({ briefing, briefingArticleId: get().article_id });
  },

  // NEW: Fetch AI Briefing
  getBriefing: async (forceRefresh = false) => {
    try {
      const article_id = get().article_id;
      const cachedBriefing = get().briefing;
      const cachedBriefingArticleId = get().briefingArticleId;

      if (!article_id) {
        console.error("No article_id found");
        return;
      }

      // Avoid duplicate LLM calls for the same article unless forced.
      if (!forceRefresh && cachedBriefing && cachedBriefingArticleId === article_id) {
        return { status: "cached", briefing: cachedBriefing };
      }

      set({ loadingBriefing: true });

      const res = await axiosInstance.post(
        `/api/articles/${article_id}/briefing`,
      );

      set({
        briefing: res.data.briefing,
        briefingArticleId: article_id,
        loadingBriefing: false,
      });
      console.log("Briefing data:", res.data);
      return res.data;
    } catch (error) {
      console.error("Briefing error:", error);
      set({ loadingBriefing: false });
    }
  },

  addArticle: async (article) => {
    try {
      const payload = {
        heading: article.title,
        body: article.content || article.description,
        author: article.author || "Unknown",
        source_url: article.url,
        source_name: article.source?.name || "Unknown",
        category: article?.category || "general",
        language: "en",
        word_count: article.content ? article.content.split(" ").length : 0,
        image_url: article.urlToImage,
        published_at: article.publishedAt,
      };
      set({
        article_id: null,
        keywordTimeline: null,
        briefing: null,
        briefingArticleId: null,
        loadingBriefing: true,
      });

      const res = await axiosInstance.post("/api/articles/add", payload);

      set({ article_id: res.data.article_id });

      console.log("Article added with ID:", res.data.article_id);

      set({ keywordTimeline: null });

      await get().processarticle(res.data.article_id);

      return res.data;
    } catch (error) {
      console.error("Error adding article:", error);
    }
  },

  processarticle: async (article_id) => {
    try {
      const res = await axiosInstance.post(
        `/api/articles/process?article_id=${article_id}`,
      );
      return res.data;
    } catch (error) {
      console.error("Error processing article:", error);
    }
  },

  getTranslation: async (language) => {
    try {
      const article_id = get().article_id;

      if (!article_id) {
        throw new Error("No article_id found");
      }

      const res = await axiosInstance.get(
        `/api/translations/${article_id}/${language}`,
      );

      set({ translation: res.data.translation });

      return res.data;
    } catch (error) {
      console.error("Translation error:", error);
      const backendMessage = error?.response?.data?.detail;
      if (backendMessage) {
        throw new Error(backendMessage);
      }
      throw error;
    }
  },
getKeywordTimeline: async () => {
  try {
    const article_id = get().article_id;

    if (!article_id) {
      console.error("No article_id found");
      return [];
    }

    set({ keywordTimeline: null, loadingKeywordTimeline: true });

    const res = await axiosInstance.get(
      `/api/articles/${article_id}/timeline`,
    );

    const timelineEvents = res.data?.events;

    if (!timelineEvents || timelineEvents.length === 0) {
      set({ keywordTimeline: [], loadingKeywordTimeline: false });
      return [];
    }

    const events = timelineEvents
      .map((item, index) => {
        const sourceIds = Array.isArray(item.source_article_ids) ? item.source_article_ids : [];
        const mappedType = item.event_type || "narrative";

        return {
          article_id: sourceIds.length === 1 ? sourceIds[0] : null,
          date: item.event_date || "",
          title: item.title || `Story Event ${index + 1}`,
          subtitle: mappedType.toUpperCase(),
          description: item.description || "No event description available.",
          type: mappedType,
        };
      })
      .sort((a, b) => {
        const left = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const right = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return left - right;
      });

    set({
      keywordTimeline: events,
      timelineArticleId: article_id,
      loadingKeywordTimeline: false,
    });

    return events;
  } catch (error) {
    console.error("Keyword timeline error:", error);
    set({ keywordTimeline: [], loadingKeywordTimeline: false });
    return [];
  }
},

  getStoryIntelligence: async (query = "") => {
    try {
      const article_id = get().article_id;

      if (!article_id) {
        console.error("No article_id found");
        return null;
      }

      set({ loadingStoryIntelligence: true });

      const params = query && query.trim() ? { params: { query: query.trim() } } : undefined;
      const res = await axiosInstance.get(
        `/api/articles/${article_id}/story-intelligence`,
        params,
      );

      set({
        storyIntelligence: res.data?.story_intelligence || null,
        loadingStoryIntelligence: false,
      });

      return res.data;
    } catch (error) {
      console.error("Story intelligence error:", error);
      set({
        storyIntelligence: null,
        loadingStoryIntelligence: false,
      });
      return null;
    }
  },

  getArticleById: async (article_id) => {
    try {
      // Step 1: Fetch the article
      const res = await axiosInstance.get(`/api/articles/${article_id}`);

      // Step 2: Set article_id in store for use by other methods
      set({ article_id });

      return res.data;
    } catch (error) {
      console.error("Error fetching article:", error);
    }
  },

 getRelatedArticles: async () => {
  try {
    const article_id = get().article_id;
    const cachedKeywordData = get().keywordData;
    const cachedKeywordArticleId = get().keywordDataArticleId;

    if (!article_id) {
      console.error("No article_id found");
      return [];
    }

    set({ loadingRelated: true });

    let keywordData = cachedKeywordData;

    if (!keywordData || cachedKeywordArticleId !== article_id) {
      const res = await axiosInstance.get(
        `/api/articles/${article_id}/keyword`
      );
      keywordData = res.data?.keyword;
      set({ keywordData: keywordData || null, keywordDataArticleId: article_id });
    }

    if (!keywordData || !keywordData.related_articles) {
      set({
        relatedArticleList: [],
        relatedArticles: [],
        loadingRelated: false
      });
      return [];
    }

    const related = keywordData.related_articles
      .filter((item) => item.article_id !== article_id)
      .slice(0, 5)
      .map((item) => ({
        article_id: item.article_id,
        title: item.title,
        date: item.created_at
      }));

    set({
      relatedArticleList: related,
      relatedArticles: related,
      loadingRelated: false
    });

    return related;

  } catch (error) {
    console.error("Related articles error:", error);

    set({
      relatedArticleList: [],
      relatedArticles: [],
      loadingRelated: false
    });

    return [];
  }
},
}));