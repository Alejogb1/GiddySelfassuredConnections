import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Function to extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const match = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
    );
    return match ? match[1] : null;
  };

  // Function to fetch summary based on YouTube URL
  const fetchSummary = async () => {
    setLoading(true);
    setSummary("");

    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);

    if (!videoId) {
      setSummary("Invalid YouTube URL. Please enter a valid URL.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/getSummary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }), // Send only the extracted video ID to backend
      });

      const data: { summary: string; error?: string } = await response.json();

      if (data.error) {
        setSummary(`Error: ${data.error}`);
        console.error("Error from backend:", data.error);
      } else {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      setSummary("Unexpected error occurred. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center text-blue-600">
          YouTube Video Summarizer
        </h1>

        <input
          type="text"
          placeholder="Enter YouTube Video URL"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:border-blue-500"
        />

        <button
          onClick={fetchSummary}
          disabled={!videoUrl || loading}
          className={`w-full py-2 px-4 rounded-md text-white ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Generating Summary..." : "Get Summary"}
        </button>

        <h2 className="text-lg sm:text-xl font-semibold mt-6 text-gray-700">
          Summary
        </h2>
        <div className="mt-2 p-3 sm:p-4 bg-gray-100 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
          {summary ? (
            <ReactMarkdown>{summary}</ReactMarkdown>
          ) : (
            <p className="text-gray-500">No summary available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
