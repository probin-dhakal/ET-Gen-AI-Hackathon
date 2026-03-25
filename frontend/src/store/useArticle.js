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


            const res = await axiosInstance.get(
                `/api/articles/${article_id}/briefing`
            );

            set({
                briefing: res.data.briefing,
                loadingBriefing: false
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
                word_count: article.content
                    ? article.content.split(" ").length
                    : 0,
                image_url: article.urlToImage,
                published_at: article.publishedAt,
            };
            set({ article_id: null, keywordTimeline: null, briefing: null,loadingBriefing:true });

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
            const res = await axiosInstance.post(`/api/articles/process?article_id=${article_id}`);
            return res.data;
        } catch (error) {
            console.error("Error processing article:", error);
        }
    },

    getTranslation: async (language) => {
        try {
            const article_id = get().article_id;

            if (!article_id) {
                console.error("No article_id found");
                return;
            }

            const res = await axiosInstance.get(
                `/api/translations/${article_id}/${language}`
            );

            set({ translation: res.data.translation });

            return res.data;

        } catch (error) {
            console.error("Translation error:", error);
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
                `/api/articles/${article_id}/keyword`
            );

            const keywordData = res.data?.keyword;

            if (!keywordData || !keywordData.related_articles) {
                set({ keywordTimeline: [] });
                return [];
            }

            const events = keywordData.related_articles
                .filter(item => article_id !== item.article_id)
                .map(item => ({
                    article_id: item.article_id,
                    date: new Date(item.created_at).toLocaleDateString(),
                    title: item.title,
                    subtitle: "Related News",
                    description: item.summary
                }));

            set({
                keywordTimeline: events,
                timelineArticleId: article_id
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
            const res = await axiosInstance.get(`/api/articles/${article_id}`);
            return res.data;
        } catch (error) {
            console.error("Error fetching article:", error);
        }
    }

}));