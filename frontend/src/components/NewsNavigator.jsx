import { useEffect } from "react";
import { useArticleStore } from "../store/useArticle";
import { MessageSquare, FileText, Activity } from "lucide-react";
import { Loader2 } from "lucide-react";

const NewsNavigator = () => {

    const { getBriefing, briefing, loadingBriefing } = useArticleStore();
    
    return (
        <div className="bg-gray-50 p-4 border border-gray-200 rounded">

            <div className="flex items-center space-x-2 mb-3">
                <MessageSquare size={18} className="text-[#cc0000]" />
                <h2 className="font-bold text-sm tracking-wider uppercase text-gray-500">
                    News Navigator
                </h2>
            </div>

            <p className="text-sm font-bold mb-2">Interactive Intelligence Briefing</p>

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
                <div className="flex items-center space-x-2 mt-4 text-sm text-gray-500">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Generating AI briefing...</span>
                </div>
            )}

            {/* AI Briefing Output */}
            {briefing && !loadingBriefing && (
                <div className="mt-4 text-sm bg-white p-3 border rounded">

                    <p className="font-semibold mb-2 text-[#cc0000]">
                        AI Intelligence Briefing
                    </p>

                    <p className="text-gray-700">{briefing.response_summary}</p>

                    {briefing.key_insights && (
                        <ul className="list-disc ml-4 mt-3 space-y-1">
                            {briefing.key_insights.map((insight, i) => (
                                <li key={i}>{insight}</li>
                            ))}
                        </ul>
                    )}

                </div>
            )}

            {/* Custom question */} <div className="mt-3 relative"> <input type="text" placeholder="Ask a custom follow-up question..." className="w-full text-xs p-2 border border-gray-300 rounded focus:outline-none focus:border-[#cc0000]" /> </div>

        </div>
    );
};

export default NewsNavigator;