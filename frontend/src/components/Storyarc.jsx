import { useEffect } from "react";
import { EventTimeline } from "./EventTimeline.jsx";
import { useArticleStore } from "../store/useArticle";
import { Loader2 } from "lucide-react";

function Storyarc() {

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

    const sentimentBadgeClass = (sentiment) => {
        const value = (sentiment || "").toLowerCase();
        if (value === "positive") return "bg-green-100 text-green-700";
        if (value === "negative") return "bg-red-100 text-red-700";
        return "bg-gray-100 text-gray-700";
    };

    return (
        <div style={{ backgroundColor: "#f3f4f6", minHeight: "100vh", padding: "40px" }}>
            <div className="max-w-6xl mx-auto space-y-6">
                {loadingKeywordTimeline ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center gap-3 text-gray-600">
                        <Loader2 size={18} className="animate-spin text-[#cc0000]" />
                        <span className="text-sm">Building timeline from story events...</span>
                    </div>
                ) : (
                    <EventTimeline events={keywordTimeline || []} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <section className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Sentiment Shifts</h3>

                        {loadingStoryIntelligence && (
                            <p className="text-xs text-gray-500">Analyzing sentiment timeline...</p>
                        )}

                        {!loadingStoryIntelligence && (!storyIntelligence?.sentiment_shifts || storyIntelligence.sentiment_shifts.length === 0) && (
                            <p className="text-xs text-gray-500">No sentiment shift data available.</p>
                        )}

                        <div className="space-y-3">
                            {(storyIntelligence?.sentiment_shifts || []).map((item, index) => (
                                <div key={`${item.time}-${index}`} className="border border-gray-100 rounded p-2">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-semibold text-gray-800">{item.time}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sentimentBadgeClass(item.sentiment)}`}>
                                            {item.sentiment}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600">{item.driver}</p>
                                    <p className="text-[11px] text-gray-500 mt-1">Shift: {item.shift_score}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Contrarian Perspectives</h3>

                        {loadingStoryIntelligence && (
                            <p className="text-xs text-gray-500">Surfacing alternative narratives...</p>
                        )}

                        {!loadingStoryIntelligence && (!storyIntelligence?.contrarian_perspectives || storyIntelligence.contrarian_perspectives.length === 0) && (
                            <p className="text-xs text-gray-500">No contrarian perspectives available.</p>
                        )}

                        <div className="space-y-3">
                            {(storyIntelligence?.contrarian_perspectives || []).map((item, index) => (
                                <div key={index} className="border border-gray-100 rounded p-2">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Mainstream</p>
                                    <p className="text-xs text-gray-700 mb-2">{item.mainstream_view}</p>

                                    <p className="text-[11px] uppercase tracking-wide text-red-600 mb-1">Contrarian</p>
                                    <p className="text-xs text-gray-800 mb-2">{item.contrarian_view}</p>

                                    <p className="text-[11px] text-gray-500">{item.why_it_matters}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">What To Watch Next</h3>

                        {loadingStoryIntelligence && (
                            <p className="text-xs text-gray-500">Building prediction watchlist...</p>
                        )}

                        {!loadingStoryIntelligence && (!storyIntelligence?.what_to_watch_next || storyIntelligence.what_to_watch_next.length === 0) && (
                            <p className="text-xs text-gray-500">No prediction watchlist available.</p>
                        )}

                        <div className="space-y-3">
                            {(storyIntelligence?.what_to_watch_next || []).map((item, index) => (
                                <div key={index} className="border border-gray-100 rounded p-2">
                                    <p className="text-xs font-semibold text-gray-800">{item.prediction}</p>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        Horizon: {item.horizon} | Probability: {item.probability}
                                    </p>
                                    <ul className="list-disc ml-4 mt-2 space-y-1 text-[11px] text-gray-600">
                                        {(item.watch_signals || []).map((signal, signalIndex) => (
                                            <li key={`${index}-${signalIndex}`}>{signal}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Storyarc;