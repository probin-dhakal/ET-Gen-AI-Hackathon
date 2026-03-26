import { create } from "zustand";
import axiosInstance from "../lib/axiosinstance.js";

export const useArticleStore = create((set, get) => ({
  article_id: null,
  translation: null,
  keywordTimeline: null,
  briefing: null,
  loadingBriefing: false,

  setArticleId: (id) => {
    set({ article_id: id });
  },

  // NEW: Fetch AI Briefing
  getBriefing: async () => {
    try {
      const article_id = get().article_id;

      if (!article_id) {
        console.error("No article_id found");
        return;
      }

      set({ loadingBriefing: true });

      const res = await axiosInstance.post(
        `/api/articles/${article_id}/briefing`,
      );

      set({
        briefing: res.data.briefing,
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
        loadingBriefing: true,
      });

      const res = await axiosInstance.post("/api/articles/add", payload);

      set({ article_id: res.data.article_id });

      console.log("Article added with ID:", res.data.article_id);

      set({ keywordTimeline: null });

      await get().processarticle(res.data.article_id);

      await get().getKeywordTimeline();

      // Optional: auto generate briefing
      await get().getBriefing();

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

      set({ keywordTimeline: null });

      const res = await axiosInstance.get(
        `/api/articles/${article_id}/keyword`,
      );

      const keywordData = res.data?.keyword;

      if (!keywordData || !keywordData.related_articles) {
        set({ keywordTimeline: [] });
        return [];
      }

      const events = keywordData.related_articles
        .filter((item) => article_id !== item.article_id)
        .map((item) => ({
          article_id: item.article_id,
          date: new Date(item.created_at).toLocaleDateString(),
          title: item.title,
          subtitle: "Related News",
          description: item.summary,
        }));

      set({
        keywordTimeline: events,
        timelineArticleId: article_id,
      });

      return events;
    } catch (error) {
      console.error("Keyword timeline error:", error);
      set({ keywordTimeline: [] });
      return [];
    }
  },

  getArticleById: async (article_id) => {
    try {
      // Step 1: Fetch the article
      const res = await axiosInstance.get(`/api/articles/${article_id}`);

      // Step 2: Set article_id in store for use by other methods
      set({ article_id });

      // Step 3: Immediately fetch related articles for this article
      try {
        set({ loadingRelated: true });
        const relatedRes = await axiosInstance.get(
          `/api/articles/${article_id}/keyword`,
        );

        const keywordData = relatedRes.data?.keyword;
        if (keywordData && keywordData.related_articles) {
          // Filter out current article and limit to 5
          const related = keywordData.related_articles
            .filter((item) => article_id !== item.article_id)
            .slice(0, 5);

          set({
            relatedArticles: related,
            loadingRelated: false,
            keywordData: keywordData,
          });
        } else {
          set({
            relatedArticles: [],
            loadingRelated: false,
            keywordData: null,
          });
        }
      } catch (relatedError) {
        console.error("Error fetching related articles:", relatedError);
        set({ relatedArticles: [], loadingRelated: false, keywordData: null });
      }

      return res.data;
    } catch (error) {
      console.error("Error fetching article:", error);
    }
  },

  relatedArticles: [],
  loadingRelated: false,
  keywordData: null,

  getRelatedArticles: async () => {
    try {
      const article_id = get().article_id;

      if (!article_id) {
        console.error("No article_id found");
        return [];
      }

      set({ loadingRelated: true });

      const res = await axiosInstance.get(
        `/api/articles/${article_id}/keyword`,
      );

      const keywordData = res.data?.keyword;

      if (!keywordData || !keywordData.related_articles) {
        set({ relatedArticles: [], loadingRelated: false, keywordData: null });
        return [];
      }

      // Remove the source article and get first 5 related articles
      const related = keywordData.related_articles
        .filter((item) => article_id !== item.article_id)
        .slice(0, 5);

      set({
        relatedArticles: related,
        loadingRelated: false,
        keywordData: keywordData,
      });

      return related;
    } catch (error) {
      console.error("Related articles error:", error);
      set({ relatedArticles: [], loadingRelated: false, keywordData: null });
      return [];
    }
  },
}));
