
import type { NextApiRequest, NextApiResponse } from "next";
import TranscriptAPI from "youtube-transcript-api";
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
const genAI = new GoogleGenerativeAI(process.env.gemini);

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
    // Step 1: Fetch the transcript using youtube-transcript-api
    console.log("Fetching transcript for video ID:", videoId);
    const transcriptArray = await TranscriptAPI.getTranscript(videoId);
    const transcriptText = transcriptArray.map(entry => entry.text).join(" ");
    console.log("Transcript fetched successfully");

    // Step 2: Combine the prompt with the transcript text (optional)
    const prompt =
    "Con tono natural resume este video en espanol siendo conciso claro en plain text en un parrafo y sin saltos de linea: ";
  const fullPrompt = `${prompt}\n\n${transcriptText}`;
  
    // Step 3: Generate summary using Google Generative AI
    console.log("Generating summary with custom prompt");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(fullPrompt);
    const summary = result.response?.text() || "No summary generated";

    res.status(200).json({ summary });
  } catch (error: any) {
    console.error("Error occurred during summary generation:", error);

    // Check if the error is due to disabled transcripts
    if (error.message.includes("transcripts disabled for that video")) {
      res.status(400).json({ summary: "", error: "Transcript is disabled for this video." });
    } else {
      res.status(500).json({ summary: "", error: "Error generating summary. Please try again later." });
    }
  }
}
