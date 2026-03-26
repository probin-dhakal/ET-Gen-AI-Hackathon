import { useEffect, useRef, useState } from "react";
import { useArticleStore } from "../store/useArticle";
import { Send } from "lucide-react";
import { Loader2 } from "lucide-react";

const NewsNavigator = () => {

    const { getBriefing, briefing, briefingArticleId, loadingBriefing, article_id, keywordData } = useArticleStore();
    const [followUpQuestion, setFollowUpQuestion] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [loadingFollowUp, setLoadingFollowUp] = useState(false);
    const chatEndRef = useRef(null);

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
        // Clear follow-up response when article changes
        setChatMessages([]);
        setFollowUpQuestion("");
    }, [article_id]);

    useEffect(() => {
        if (!article_id) return;
        if (briefing && briefingArticleId === article_id) return;
        getBriefing();
    }, [article_id, briefing, briefingArticleId, getBriefing]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, loadingFollowUp]);
    
    // Construct a more contextual query with article heading and user question
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
    
    const handleFollowUpQuestion = async () => {
        if (!followUpQuestion.trim() || !article_id) return;
        const userQuestion = followUpQuestion.trim();
        
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
            
            // Enhance the query with context
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
    
    return (
        <div className="space-y-3">


            {/* Loader while AI is generating briefing */}
            {loadingBriefing && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Generating AI briefing...</span>
                </div>
            )}

            {/* AI Briefing Output */}
            {briefing && briefingArticleId === article_id && !loadingBriefing && (
                <div className="text-sm bg-white p-3 border border-blue-200 rounded">

                    <p className="font-semibold mb-2 text-[#cc0000]">
                        🤖 AI Intelligence Briefing
                    </p>

                    {showBriefingSummary && (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{briefing.response_summary}</p>
                    )}

                    {briefing.key_insights && briefing.key_insights.length > 0 && (
                        <ul className="list-disc ml-4 mt-3 space-y-1 text-gray-600">
                            {briefing.key_insights.map((insight, i) => (
                                <li key={i} className="text-xs">{insight}</li>
                            ))}
                        </ul>
                    )}

                </div>
            )}

            {/* Follow-up Chat Section */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-700">Follow-up Chat</p>
                </div>

                <div className="h-64 overflow-y-auto px-3 py-3 space-y-2 bg-[#fcfcfc]">
                    {chatMessages.length === 0 && !loadingFollowUp && (
                        <p className="text-xs text-gray-500">
                            Ask follow-up questions about this article cluster.
                        </p>
                    )}

                    {chatMessages.map((message) => {
                        const isUser = message.role === "user";
                        const showSummary = shouldShowMessageSummary(message.response, message.insights);

                        return (
                            <div
                                key={message.id}
                                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                                        isUser
                                            ? "bg-[#cc0000] text-white rounded-br-sm"
                                            : "bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200"
                                    }`}
                                >
                                    {showSummary && (
                                        <p className="whitespace-pre-line">{message.response}</p>
                                    )}

                                    {!isUser && message.insights && message.insights.length > 0 && (
                                        <ul className="list-disc ml-4 mt-2 space-y-1">
                                            {message.insights.map((insight, i) => (
                                                <li key={`${message.id}-${i}`} className="text-xs">{insight}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {loadingFollowUp && (
                        <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2 text-xs bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-2">
                                <Loader2 className="animate-spin" size={14} />
                                <span>Analyzing your question...</span>
                            </div>
                        </div>
                    )}

                    {/* <div ref={chatEndRef} /> */}
                </div>

                <div className="border-t border-gray-100 p-2 bg-white">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={followUpQuestion}
                            onChange={(e) => setFollowUpQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleFollowUpQuestion()}
                            placeholder="Ask a follow-up..."
                            className="flex-1 text-xs p-2 border border-gray-300 rounded focus:outline-none focus:border-[#cc0000] placeholder-gray-400"
                        />
                        <button
                            onClick={handleFollowUpQuestion}
                            disabled={loadingFollowUp || !followUpQuestion.trim()}
                            className="bg-[#cc0000] text-white p-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loadingFollowUp ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default NewsNavigator;