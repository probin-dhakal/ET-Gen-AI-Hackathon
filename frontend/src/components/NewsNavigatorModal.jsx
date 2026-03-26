import { useEffect, useMemo, useRef, useState } from "react";
import { useArticleStore } from "../store/useArticle";
import { ArrowRight, ArrowUp, Loader2, Sparkles, X } from "lucide-react";

const NewsNavigatorModal = ({ isOpen, onClose }) => {
    const {
        getBriefing,
        briefing,
        briefingArticleId,
        loadingBriefing,
        article_id,
        keywordData,
        getRelatedArticles,
        relatedArticleList,
        relatedArticles,
        loadingRelated,
    } = useArticleStore();
    const [followUpQuestion, setFollowUpQuestion] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [loadingFollowUp, setLoadingFollowUp] = useState(false);
    const chatEndRef = useRef(null);

    const suggestedQuestions = useMemo(() => {
        const title = keywordData?.source_heading || "this story";
        return [
            `What are the most important takeaways from ${title}?`,
            "How does this impact businesses in the next 6 months?",
            "What data points should I track next on this topic?",
        ];
    }, [keywordData?.source_heading]);

    const normalizeText = (text) =>
        (text || "")
            .toLowerCase()
            .replace(/[•\-]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    const summaryToLines = (summary) =>
        (summary || "")
            .split(/\r?\n+/)
            .map((line) => line.trim())
            .filter(Boolean);

    const isDuplicateSummary = (summary, insights = []) => {
        if (!summary || !insights?.length) return false;

        const summaryNormalized = summaryToLines(summary).map(normalizeText).filter(Boolean);
        const insightNormalized = insights.map(normalizeText).filter(Boolean);

        if (!summaryNormalized.length || !insightNormalized.length) return false;

        const summaryJoined = summaryNormalized.join(" |");
        const insightsJoined = insightNormalized.join(" |");

        return summaryJoined === insightsJoined;
    };

    useEffect(() => {
        setChatMessages([]);
        setFollowUpQuestion("");
    }, [article_id]);

    useEffect(() => {
        if (!article_id) return;
        if (briefing && briefingArticleId === article_id) return;
        getBriefing();
    }, [article_id, briefing, briefingArticleId, getBriefing]);

    useEffect(() => {
        if (!isOpen || !article_id) return;
        getRelatedArticles();
    }, [isOpen, article_id, getRelatedArticles]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, loadingFollowUp]);

    const constructEnhancedQuery = (userQuestion) => {
        const articleHeading = keywordData?.source_heading || "article";
        
        return `Context: This question is about the article titled "${articleHeading}".

User's Question: ${userQuestion}

Please provide a comprehensive answer based on the related articles in this topic cluster. Include:
1. Direct answer to the user's question
2. Relevant context from the articles
3. Any implications or connections to the main article
Keep the response concise but informative.`;
    };
    
    const handleFollowUpQuestion = async (questionOverride) => {
        const userQuestion = (questionOverride || followUpQuestion).trim();
        if (!userQuestion || !article_id) return;
        
        try {
            setLoadingFollowUp(true);
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `user-${Date.now()}`,
                    role: "user",
                    response: userQuestion,
                    insights: [],
                },
            ]);
            setFollowUpQuestion("");
            
            const enhancedQuery = constructEnhancedQuery(userQuestion);
            
            const response = await fetch(
                `http://localhost:8000/api/articles/${article_id}/briefing?query=${encodeURIComponent(enhancedQuery)}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to generate response");
            }

            const data = await response.json();
            
            if (data.status === "success" && data.briefing) {
                setChatMessages((prev) => [
                    ...prev,
                    {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        response: data.briefing.response_summary || "Response generated from related articles.",
                        insights: data.briefing.key_insights || [],
                    },
                ]);
            } else {
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error("Follow-up question error:", error);
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `assistant-error-${Date.now()}`,
                    role: "assistant",
                    response: `Error: ${error.message || "Unable to generate response. Please try again."}`,
                    insights: [],
                },
            ]);
        } finally {
            setLoadingFollowUp(false);
        }
    };

    const showBriefingSummary =
        briefingArticleId === article_id &&
        briefing?.response_summary &&
        !isDuplicateSummary(briefing.response_summary, briefing.key_insights || []);

    const shouldShowMessageSummary = (response, insights) =>
        response && !isDuplicateSummary(response, insights || []);

    const submitQuestion = async (question) => {
        await handleFollowUpQuestion(question);
    };

    const modalRelatedArticles =
        relatedArticles && relatedArticles.length > 0
            ? relatedArticles.map((item) => ({
                  article_id: item.article_id,
                  title: item.title,
                  date: item.created_at,
                  summary: item.summary,
              }))
            : relatedArticleList;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/55 p-2 md:p-4">
            <div className="mx-auto h-full w-full max-w-470 rounded-2xl bg-[#f6f6f6] shadow-2xl flex flex-col overflow-hidden">
                <div className="h-14 border-b border-gray-300 bg-white px-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <p className="text-2xl leading-none font-black tracking-tight">Deeper</p>
                        <p className="text-2xl leading-none font-light tracking-tight">Dive</p>
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-400 text-gray-600">BETA Learn More</span>
                    </div>
                    <button onClick={onClose} className="text-black hover:opacity-70 transition-opacity" aria-label="Close">
                        <X size={30} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-245 px-5 py-8 md:py-12">
                        <h1 className="text-2xl md:text-4xl leading-tight font-extrabold text-black mb-4">
                            {keywordData?.source_heading || "What should we understand from this story?"}
                        </h1>

                        <div className="inline-flex items-center gap-2 rounded-lg bg-red-100 text-[#cf1020] text-xs md:text-sm font-bold px-4 py-2 mb-6">
                            <Sparkles size={18} />
                            AI Generated by ET Newsroom
                        </div>

                        {loadingBriefing && (
                            <div className="flex items-center gap-3 text-gray-600 text-sm md:text-lg mb-6">
                                <Loader2 size={22} className="animate-spin text-[#cf1020]" />
                                This might take a moment as we gather all the necessary information
                            </div>
                        )}

                        {!loadingBriefing && briefing && briefingArticleId === article_id && (
                            <>
                                {showBriefingSummary && (
                                    <p className="text-base md:text-2xl leading-normal text-black whitespace-pre-line mb-6">
                                        {briefing.response_summary}
                                    </p>
                                )}

                                {briefing.key_insights && briefing.key_insights.length > 0 && (
                                    <ul className="mb-8 space-y-2 text-sm md:text-lg leading-relaxed text-black">
                                        {briefing.key_insights.map((insight, i) => (
                                            <li key={i} className="flex gap-3">
                                                <span className="text-[#cf1020]">•</span>
                                                <span>{insight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </>
                        )}

                        {chatMessages.map((message) => {
                            const isUser = message.role === "user";
                            const showSummary = shouldShowMessageSummary(message.response, message.insights);
                            return (
                                <div key={message.id} className={`mb-4 ${isUser ? "text-right" : "text-left"}`}>
                                    {showSummary && (
                                        <div className={`${isUser ? "ml-auto bg-[#cf1020] text-white" : "bg-white border border-gray-300 text-black"} max-w-[92%] rounded-2xl px-5 py-4 text-sm md:text-lg leading-relaxed`}>
                                            {message.response}
                                        </div>
                                    )}
                                    {!isUser && message.insights && message.insights.length > 0 && (
                                        <ul className="mt-2 ml-2 space-y-1 text-xs md:text-sm text-black">
                                            {message.insights.map((insight, i) => (
                                                <li key={`${message.id}-${i}`} className="flex gap-2">
                                                    <span>•</span>
                                                    <span>{insight}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}

                        {loadingFollowUp && (
                            <div className="mb-4 inline-flex items-center gap-3 rounded-2xl border border-gray-300 bg-white px-5 py-4 text-xs md:text-base text-gray-600">
                                <Loader2 size={18} className="animate-spin text-[#cf1020]" />
                                Analyzing your question...
                            </div>
                        )}

                        <div className="mt-10">
                            {suggestedQuestions.map((question) => (
                                <button
                                    key={question}
                                    onClick={() => submitQuestion(question)}
                                    className="w-full text-left mb-4 border border-gray-400 bg-white rounded-full px-7 py-3 text-sm md:text-base leading-tight text-black flex items-center justify-between hover:border-[#cf1020] transition-colors"
                                >
                                    <span className="pr-4">{question}</span>
                                    <span className="h-12 w-12 min-w-12 rounded-full bg-[#cf1020] text-white inline-flex items-center justify-center">
                                        <ArrowRight size={22} />
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 rounded-3xl border border-gray-300 bg-[#ececec] p-5">
                            <p className="text-sm md:text-base text-black mb-4">Would you like to know more about this topic?</p>
                            <div className="rounded-full bg-white border border-gray-300 px-4 py-2 flex items-center gap-3">
                                <input
                                    type="text"
                                    value={followUpQuestion}
                                    onChange={(e) => setFollowUpQuestion(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleFollowUpQuestion()}
                                    placeholder="Type your answer here"
                                    className="flex-1 bg-transparent text-sm md:text-base text-black placeholder:text-gray-500 outline-none"
                                />
                                <button
                                    onClick={() => handleFollowUpQuestion()}
                                    disabled={loadingFollowUp || !followUpQuestion.trim() || !article_id}
                                    className="h-12 w-12 min-w-12 rounded-full bg-[#cf1020] text-white inline-flex items-center justify-center disabled:opacity-50"
                                >
                                    {loadingFollowUp ? <Loader2 size={22} className="animate-spin" /> : <ArrowUp size={22} />}
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 pt-2">
                            <h3 className="text-xl md:text-2xl font-bold text-black mb-4">Related Articles</h3>

                            {loadingRelated ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Loader2 className="animate-spin text-[#cf1020]" size={16} />
                                    Loading related articles...
                                </div>
                            ) : modalRelatedArticles && modalRelatedArticles.length > 0 ? (
                                <div className="space-y-3">
                                    {modalRelatedArticles.slice(0, 4).map((item) => (
                                        <div key={item.article_id} className="rounded-2xl border border-gray-300 bg-white px-4 py-3">
                                            <p className="text-sm md:text-base font-semibold text-black leading-snug">{item.title}</p>
                                            {item.summary && (
                                                <p className="mt-1 text-xs md:text-sm text-gray-600 line-clamp-2">{item.summary}</p>
                                            )}
                                            {item.date && (
                                                <p className="mt-2 text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No related articles available.</p>
                            )}
                        </div>

                        <div ref={chatEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsNavigatorModal;
