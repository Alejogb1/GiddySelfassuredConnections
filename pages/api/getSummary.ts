import type { NextApiRequest, NextApiResponse } from "next";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface SummaryRequestBody {
  videoId: string;
}

interface SummaryResponseBody {
  summary: string;
  error?: string;
}

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI("AIzaSyBc6r8pZgDN6zw373sZeJCFZYIyXNULJTs");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SummaryResponseBody>,
) {
  if (req.method !== "POST") {
    res.status(405).json({ summary: "", error: "Method Not Allowed" });
    return;
  }

  const { videoId } = req.body as SummaryRequestBody;

  if (!videoId) {
    res.status(400).json({ summary: "", error: "Video ID is required" });
    return;
  }

  try {
    // Step 1: Fetch the transcript using YoutubeTranscript
    console.log("Fetching transcript for video ID:", videoId);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map((entry) => entry.text).join(" ");
    console.log("Transcript fetched successfully");
    const prompt =
      "Con tono natural resume este video en espanol siendo conciso claro en plain text en un parrafo y sin saltos de linea: ";
    const fullPrompt = `${prompt}\n\n${transcriptText}`;

    // Step 2: Generate summary using Google Generative AI
    console.log("Generating summary for the fetched transcript");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(fullPrompt);
    const summary = result.response?.text() || "No summary generated";

    res.status(200).json({ summary });
  } catch (error: any) {
    console.error("Error occurred during summary generation:", error);

    // More detailed error response for the frontend
    res.status(500).json({
      summary: "",
      error: error.message || "Error generating summary. Check backend logs.",
    });
  }
}
