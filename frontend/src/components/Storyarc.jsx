import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EventTimeline } from "./EventTimeline.jsx";
import { useArticleStore } from "../store/useArticle";
import { Loader2, X, TrendingUp, AlertCircle, Eye, ChevronDown, ChevronUp, Calendar } from "lucide-react";

function Storyarc() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('timeline');
    const [expandedSections, setExpandedSections] = useState({
        sentiment: false,
        contrarian: false,
        watchNext: false,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const {
        keywordTimeline,
        loadingKeywordTimeline,
        storyIntelligence,
        loadingStoryIntelligence,
        getKeywordTimeline,
        getStoryIntelligence,
    } = useArticleStore();

    useEffect(() => {
        getKeywordTimeline();
        getStoryIntelligence();
    }, [getKeywordTimeline, getStoryIntelligence]);

    // Helper to truncate text
    const truncateText = (text, maxLength = 300) => {
        if (!text) return "";
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    const sentimentBadgeClass = (sentiment) => {
        const value = (sentiment || "").toLowerCase();
        if (value === "positive") return "bg-green-100 text-green-700";
        if (value === "negative") return "bg-red-100 text-red-700";
        return "bg-blue-100 text-blue-700";
    };

    const sentimentBorderClass = (sentiment) => {
        const value = (sentiment || "").toLowerCase();
        if (value === "positive") return "border-l-4 border-l-green-500";
        if (value === "negative") return "border-l-4 border-l-red-500";
        return "border-l-4 border-l-blue-500";
    };

    return (
        <div style={{ backgroundColor: "#f3f4f6", minHeight: "100vh", padding: "20px" }}>
            <div className="max-w-6xl mx-auto">
                {/* Header with Close Button */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-5xl font-bold text-gray-900">Story Arc Analysis</h1>
                        <p className="text-base text-gray-500 mt-1">Track sentiment, perspectives, and predictions</p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-300 rounded-full transition-all duration-200 bg-gray-200"
                        aria-label="Close story arc"
                    >
                        <X size={24} className="text-gray-700" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
                    <div className="flex flex-wrap border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`px-6 py-3 font-semibold text-base flex items-center gap-2 transition-colors border-b-2 ${
                                activeTab === 'timeline'
                                    ? 'text-blue-600 border-b-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 border-b-transparent'
                            }`}
                        >
                            <Calendar size={18} />
                            Timeline
                        </button>
                        <button
                            onClick={() => setActiveTab('sentiment')}
                            className={`px-6 py-3 font-semibold text-base flex items-center gap-2 transition-colors border-b-2 ${
                                activeTab === 'sentiment'
                                    ? 'text-blue-600 border-b-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 border-b-transparent'
                            }`}
                        >
                            <TrendingUp size={18} />
                            Sentiment Shifts
                        </button>
                        <button
                            onClick={() => setActiveTab('contrarian')}
                            className={`px-6 py-3 font-semibold text-base flex items-center gap-2 transition-colors border-b-2 ${
                                activeTab === 'contrarian'
                                    ? 'text-blue-600 border-b-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 border-b-transparent'
                            }`}
                        >
                            <AlertCircle size={18} />
                            Contrarian View
                        </button>
                        <button
                            onClick={() => setActiveTab('watchNext')}
                            className={`px-6 py-3 font-semibold text-base flex items-center gap-2 transition-colors border-b-2 ${
                                activeTab === 'watchNext'
                                    ? 'text-blue-600 border-b-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 border-b-transparent'
                            }`}
                        >
                            <Eye size={18} />
                            Watch Next
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    {/* Timeline Tab */}
                    {activeTab === 'timeline' && (
                        <div>
                            {loadingKeywordTimeline ? (
                                <div className="flex items-center gap-3 text-gray-600 p-6">
                                    <Loader2 size={18} className="animate-spin text-[#cc0000]" />
                                    <span className="text-base font-medium">Building timeline from story events...</span>
                                </div>
                            ) : (
                                <EventTimeline events={keywordTimeline || []} />
                            )}
                        </div>
                    )}

                    {/* Sentiment Tab */}
                    {activeTab === 'sentiment' && (
                        <div>
                            {loadingStoryIntelligence && (
                                <p className="text-sm text-gray-500 p-4">Analyzing sentiment...</p>
                            )}

                            {!loadingStoryIntelligence && (!storyIntelligence?.sentiment_shifts || storyIntelligence.sentiment_shifts.length === 0) && (
                                <p className="text-sm text-gray-500 p-4">No sentiment shifts available.</p>
                            )}

                            <div className="space-y-3">
                                {(storyIntelligence?.sentiment_shifts || []).slice(0, expandedSections.sentiment ? undefined : 3).map((item, index) => (
                                    <div key={`${item.time}-${index}`} className={`rounded-lg p-4 bg-gray-50 ${sentimentBorderClass(item.sentiment)}`}>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-base font-semibold text-gray-900">{item.time}</span>
                                            <span className={`text-xs px-3 py-1 rounded-full font-bold ${sentimentBadgeClass(item.sentiment)}`}>
                                                {item.sentiment?.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-base text-gray-700 leading-relaxed mb-2">{truncateText(item.driver, 300)}</p>
                                        <p className="text-sm text-gray-500 font-medium">Shift Score: {item.shift_score}</p>
                                    </div>
                                ))}
                            </div>

                            {(storyIntelligence?.sentiment_shifts || []).length > 3 && (
                                <button
                                    onClick={() => toggleSection('sentiment')}
                                    className="mt-4 w-full flex items-center justify-center gap-2 text-base font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-3 rounded-lg transition-colors"
                                >
                                    {expandedSections.sentiment ? (
                                        <>
                                            Show Less <ChevronUp size={16} />
                                        </>
                                    ) : (
                                        <>
                                            Show More (+{(storyIntelligence?.sentiment_shifts || []).length - 3}) <ChevronDown size={16} />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Contrarian Tab */}
                    {activeTab === 'contrarian' && (
                        <div>
                            {loadingStoryIntelligence && (
                                <p className="text-sm text-gray-500 p-4">Surfacing perspectives...</p>
                            )}

                            {!loadingStoryIntelligence && (!storyIntelligence?.contrarian_perspectives || storyIntelligence.contrarian_perspectives.length === 0) && (
                                <p className="text-sm text-gray-500 p-4">No contrarian perspectives available.</p>
                            )}

                            <div className="space-y-3">
                                {(storyIntelligence?.contrarian_perspectives || []).slice(0, expandedSections.contrarian ? undefined : 3).map((item, index) => (
                                    <div key={index} className="rounded-lg p-4 bg-gray-50 border-l-4 border-l-orange-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm uppercase tracking-wider font-bold text-gray-600 mb-2">Mainstream View</p>
                                                <p className="text-base text-gray-700 leading-relaxed">{truncateText(item.mainstream_view, 300)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm uppercase tracking-wider font-bold text-red-600 mb-2">Contrarian View</p>
                                                <p className="text-base text-gray-800 leading-relaxed">{truncateText(item.contrarian_view, 300)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {(storyIntelligence?.contrarian_perspectives || []).length > 3 && (
                                <button
                                    onClick={() => toggleSection('contrarian')}
                                    className="mt-4 w-full flex items-center justify-center gap-2 text-base font-semibold text-orange-600 hover:text-orange-800 hover:bg-orange-50 p-3 rounded-lg transition-colors"
                                >
                                    {expandedSections.contrarian ? (
                                        <>
                                            Show Less <ChevronUp size={16} />
                                        </>
                                    ) : (
                                        <>
                                            Show More (+{(storyIntelligence?.contrarian_perspectives || []).length - 3}) <ChevronDown size={16} />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Watch Next Tab */}
                    {activeTab === 'watchNext' && (
                        <div>
                            {loadingStoryIntelligence && (
                                <p className="text-sm text-gray-500 p-4">Building watchlist...</p>
                            )}

                            {!loadingStoryIntelligence && (!storyIntelligence?.what_to_watch_next || storyIntelligence.what_to_watch_next.length === 0) && (
                                <p className="text-sm text-gray-500 p-4">No predictions available.</p>
                            )}

                            <div className="space-y-3">
                                {(storyIntelligence?.what_to_watch_next || []).slice(0, expandedSections.watchNext ? undefined : 3).map((item, index) => (
                                    <div key={index} className="rounded-lg p-4 bg-gray-50 border-l-4 border-l-purple-500">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <p className="text-base font-semibold text-gray-900 flex-1 leading-relaxed">{truncateText(item.prediction, 300)}</p>
                                            <span className="text-xs bg-purple-200 text-purple-800 px-3 py-1 rounded-full font-bold whitespace-nowrap">{item.probability}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 font-medium mb-3">Horizon: {item.horizon}</p>
                                        {(item.watch_signals || []).length > 0 && (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 mb-2">Watch Signals:</p>
                                                <ul className="list-disc ml-4 space-y-1">
                                                    {(item.watch_signals || []).slice(0, 3).map((signal, signalIndex) => (
                                                        <li key={`${index}-${signalIndex}`} className="text-sm text-gray-600">{truncateText(signal, 200)}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {(storyIntelligence?.what_to_watch_next || []).length > 3 && (
                                <button
                                    onClick={() => toggleSection('watchNext')}
                                    className="mt-4 w-full flex items-center justify-center gap-2 text-base font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-3 rounded-lg transition-colors"
                                >
                                    {expandedSections.watchNext ? (
                                        <>
                                            Show Less <ChevronUp size={16} />
                                        </>
                                    ) : (
                                        <>
                                            Show More (+{(storyIntelligence?.what_to_watch_next || []).length - 3}) <ChevronDown size={16} />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Storyarc;