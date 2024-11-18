import type { NextApiRequest, NextApiResponse } from "next";
import Transcriptor from "youtube-video-transcript";
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
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // Preflight request for CORS
    res.status(200).end();
    return;
  }

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
    console.log("Fetching transcript for video ID:", videoId);

    // Fetch the transcript using youtube-video-transcript
    const transcriptData = await Transcriptor.getTranscript(videoId, ['en']);
    
    // Check if transcriptData is an array and get the `data` property accordingly
    const transcriptText = Array.isArray(transcriptData)
      ? transcriptData.map(t => t.data.map(entry => entry.text).join(" ")).join(" ")
      : transcriptData.data.map(entry => entry.text).join(" ");
    
    console.log("Transcript fetched successfully");

    const prompt =
      "Con tono natural, resume este video en español sin saltos de linea, que aborde las conclusiones. Tambien, agrega 5 bullet points de los detalles y especifciaciones mencionadas mas importantes en el video.";
    const fullPrompt = `${prompt}\n\n${transcriptText}`;
    // Generate summary using Google Generative AI
    console.log("Generating summary with custom prompt");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(fullPrompt);
    const summary = result.response?.text() || "No summary generated";

    res.status(200).json({ summary });
  } catch (error: any) {
    console.error("Error occurred during summary generation:", error);

    // Return an error message if transcript fetching or summary generation fails
    res.status(500).json({ summary: "", error: "Error generating summary. Please try again later." });
  }
}