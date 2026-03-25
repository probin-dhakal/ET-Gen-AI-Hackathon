import axios from "axios";

const getBaseUrls = () => {
    const envBase = import.meta.env.VITE_API_BASE_URL;
    const preferred = envBase || "http://localhost:8000";
    const fallback = preferred.includes(":8000")
        ? preferred.replace(":8000", ":8001")
        : "http://localhost:8001";

    return [preferred, fallback].filter((url, index, arr) => url && arr.indexOf(url) === index);
};

const apiBaseUrls = getBaseUrls();

const axiosInstance = axios.create({
    baseURL: apiBaseUrls[0],
});

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        if (!config) {
            return Promise.reject(error);
        }

        const canRetryOnNetworkError = !error.response;
        const alreadyRetried = Boolean(config.__portFallbackRetried);
        const hasAlternateBase = apiBaseUrls.length > 1;

        if (!canRetryOnNetworkError || alreadyRetried || !hasAlternateBase) {
            return Promise.reject(error);
        }

        config.__portFallbackRetried = true;
        config.baseURL = apiBaseUrls[1];

        return axiosInstance.request(config);
    }
);

export default axiosInstance;