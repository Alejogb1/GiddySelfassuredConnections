import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [videoId, setVideoId] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Function to directly fetch summary based on video ID
  const fetchSummary = async () => {
    setLoading(true);
    setSummary("");

    try {
      const response = await fetch("/api/getSummary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      const data: { summary: string; error?: string } = await response.json();

      if (data.error) {
        setSummary(`Error: ${data.error}`); // Show detailed error from backend
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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-blue-600">
          YouTube Video Summarizer
        </h1>

        <input
          type="text"
          placeholder="Enter YouTube Video ID"
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:border-blue-500"
        />

        <button
          onClick={fetchSummary}
          disabled={!videoId || loading}
          className={`w-full py-2 px-4 rounded-md text-white ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Generating Summary..." : "Get Summary"}
        </button>

        <h2 className="text-xl font-semibold mt-6 text-gray-700">Summary</h2>
        <div className="mt-2 p-4 bg-gray-100 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
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
