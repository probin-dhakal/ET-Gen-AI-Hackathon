import { useState } from "react";
import { useArticleStore } from "../store/useArticle";
import { MessageSquare, FileText, Activity, Send } from "lucide-react";
import { Loader2 } from "lucide-react";

const NewsNavigator = () => {

    const { getBriefing, briefing, loadingBriefing, article_id, keywordData } = useArticleStore();
    const [followUpQuestion, setFollowUpQuestion] = useState("");
    const [followUpResponse, setFollowUpResponse] = useState(null);
    const [loadingFollowUp, setLoadingFollowUp] = useState(false);
    
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
        
        try {
            setLoadingFollowUp(true);
            
            // Enhance the query with context
            const enhancedQuery = constructEnhancedQuery(followUpQuestion);
            
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
                setFollowUpResponse({
                    question: followUpQuestion,
                    response: data.briefing.response_summary || "Response generated from related articles.",
                    insights: data.briefing.key_insights || []
                });
                setFollowUpQuestion("");
            } else {
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error("Follow-up question error:", error);
            setFollowUpResponse({
                question: followUpQuestion,
                response: `Error: ${error.message || "Unable to generate response. Please try again."}`,
                insights: []
            });
        } finally {
            setLoadingFollowUp(false);
        }
    };
    
    return (
        <div className="space-y-3">

            <div className="space-y-2 text-sm">

                <button
                    onClick={getBriefing}
                    className="w-full text-left bg-white border border-gray-300 p-2 rounded hover:border-[#cc0000] hover:text-[#cc0000] transition-colors flex items-center"
                >
                    <FileText size={14} className="mr-2" />
                    Summarize in 3 bullet points
                </button>

                <button
                    onClick={getBriefing}
                    className="w-full text-left bg-white border border-gray-300 p-2 rounded hover:border-[#cc0000] hover:text-[#cc0000] transition-colors flex items-center"
                >
                    <Activity size={14} className="mr-2" />
                    How does this impact markets?
                </button>

            </div>

            {/* Loader while AI is generating briefing */}
            {loadingBriefing && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Generating AI briefing...</span>
                </div>
            )}

            {/* AI Briefing Output */}
            {briefing && !loadingBriefing && (
                <div className="text-sm bg-white p-3 border border-blue-200 rounded">

                    <p className="font-semibold mb-2 text-[#cc0000]">
                        🤖 AI Intelligence Briefing
                    </p>

                    <p className="text-gray-700 leading-relaxed">{briefing.response_summary}</p>

                    {briefing.key_insights && briefing.key_insights.length > 0 && (
                        <ul className="list-disc ml-4 mt-3 space-y-1 text-gray-600">
                            {briefing.key_insights.map((insight, i) => (
                                <li key={i} className="text-xs">{insight}</li>
                            ))}
                        </ul>
                    )}

                </div>
            )}

            {/* Follow-up Question Section */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Ask a Follow-up Question</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={followUpQuestion}
                        onChange={(e) => setFollowUpQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleFollowUpQuestion()}
                        placeholder="E.g., What happens next..." 
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

            {/* Follow-up Response */}
            {followUpResponse && !loadingFollowUp && (
                <div className="text-sm bg-green-50 p-3 border border-green-200 rounded">
                    <p className="font-semibold text-green-700 mb-2">
                        ✓ Response to: "{followUpResponse.question}"
                    </p>
                    <p className="text-gray-700 leading-relaxed">{followUpResponse.response}</p>
                    
                    {followUpResponse.insights && followUpResponse.insights.length > 0 && (
                        <ul className="list-disc ml-4 mt-2 space-y-1 text-gray-600">
                            {followUpResponse.insights.map((insight, i) => (
                                <li key={i} className="text-xs">{insight}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Loading state for follow-up */}
            {loadingFollowUp && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Analyzing your question...</span>
                </div>
            )}

        </div>
    );
};

export default NewsNavigator;