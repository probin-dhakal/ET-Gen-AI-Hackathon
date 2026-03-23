import { useEffect } from "react";
import { EventTimeline } from "./EventTimeline.jsx";
import { useArticleStore } from "../store/useArticle";

function Storyarc() {

    const { keywordTimeline, getKeywordTimeline } = useArticleStore();

    useEffect(() => {
        getKeywordTimeline();
    }, []);

    return (
        <div style={{ backgroundColor: "#f3f4f6", minHeight: "100vh", padding: "40px" }}>
            <EventTimeline events={keywordTimeline || []} />
        </div>
    );
}

export default Storyarc;