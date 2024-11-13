import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface SummaryRequestBody {
  videoId: string;
  prompt?: string;
}

interface SummaryResponseBody {
  summary: string;
  error?: string;
}

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SummaryResponseBody>
) {
  if (req.method !== "POST") {
    res.status(405).json({ summary: "", error: "Method Not Allowed" });
    return;
  }

  const { videoId, prompt } = req.body as SummaryRequestBody;

  if (!videoId) {
    res.status(400).json({ summary: "", error: "Video ID is required" });
    return;
  }

  try {
    // Fetch transcript using YouTube's timed text endpoint
    const transcriptResponse = await axios.get(
      `http://video.google.com/timedtext?lang=en&v=${videoId}`
    );

    // Parse the transcript XML data
    const transcriptData = transcriptResponse.data;
    const transcriptText = transcriptData
      .match(/<text[^>]*>(.*?)<\/text>/g)
      ?.map((text: string) => text.replace(/<[^>]+>/g, ""))
      .join(" ") || "No transcript available";

    // Combine the prompt with the transcript text (optional)
    const fullPrompt = prompt ? `${prompt}\n\n${transcriptText}` : transcriptText;

    // Generate summary using Google Generative AI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(fullPrompt);
    const summary = result.response?.text() || "No summary generated";

    res.status(200).json({ summary });
  } catch (error: any) {
    console.error("Error occurred during summary generation:", error);

    res.status(500).json({ summary: "", error: "Error generating summary. Please try again later." });
  }
}
