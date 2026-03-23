import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { useNavigate } from "react-router-dom";
import { useArticleStore } from "../store/useArticle";

export const EventTimeline = ({ events = [] }) => {
    const navigate = useNavigate();
    const { getArticleById } = useArticleStore();

    const handleClick = async (article_id) => {
        try {
            const rawArticle = await getArticleById(article_id);

            if (!rawArticle) return;

            const body = rawArticle.body || "";

            const article = {
                title: rawArticle.heading || "Untitled",
                description: body.substring(0, 200),
                content: body,
                author: rawArticle.author || "Unknown",
                url: rawArticle.source_url || "",
                urlToImage: rawArticle.image_url || "",
                publishedAt: rawArticle.published_at || "",
                source: {
                    name: rawArticle.source_name || "ET Bureau"
                }
            };

            navigate("/article", { state: { article } });

        } catch (error) {
            console.error("Navigation error:", error);
        }
    };

    return (
        <VerticalTimeline lineColor="#6b7280">
            {events.map((event, index) => (
                <VerticalTimelineElement
                    key={event.article_id || index}
                    date={event.date || ""}
                    iconStyle={{
                        background: "#2563eb",
                        color: "#fff",
                        width: "25px",
                        height: "25px",
                        marginLeft: "-12px"
                    }}
                >
                    <div
                        onClick={() => handleClick(event.article_id)}
                        className="cursor-pointer hover:text-blue-600 transition"
                    >
                        <h3 className="font-semibold">{event.title}</h3>
                        <h4 className="text-gray-500">{event.subtitle}</h4>
                        <p className="text-gray-700">{event.description}</p>
                    </div>
                </VerticalTimelineElement>
            ))}
        </VerticalTimeline>
    );
};