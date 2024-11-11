// pages/api/getsummary.js (or getsummary.ts if using TypeScript)

import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import * as cheerio from "cheerio";
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
if (!process.env.gemini) {
  console.error("Error: 'gemini' API key is not set in environment variables.");
  throw new Error("Server configuration error.");
}
const genAI = new GoogleGenerativeAI(process.env.gemini);

// Include the TranscriptAPI code directly
class TranscriptAPI {
  static async getTranscript(id: string, config = {}) {
    try {
      const url = new URL("https://youtubetranscript.com");
      url.searchParams.set("server_vid2", id);

      const response = await axios.get(url.toString(), config);
      const $ = cheerio.load(response.data, undefined, false);
      const err = $("error");

      if (err.length) throw new Error(err.text());

      return $("transcript text")
        .map((i, elem) => {
          const $a = $(elem);
          return {
            text: $a.text(),
            start: Number($a.attr("start")),
            duration: Number($a.attr("dur")),
          };
        })
        .toArray();
    } catch (error) {
      console.error(`Error fetching transcript for video ID ${id}:`, error);
      throw error; // Re-throw the error to be handled in the calling function
    }
  }

  static async validateID(id: string, config = {}) {
    const url = new URL("https://video.google.com/timedtext");
    url.searchParams.set("type", "track");
    url.searchParams.set("v", id);
    url.searchParams.set("id", "0");
    url.searchParams.set("lang", "en");

    try {
      await axios.get(url.toString(), config);
      return true;
    } catch (error) {
      console.error(`Error validating video ID ${id}:`, error);
      return false;
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SummaryResponseBody>
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
    // Step 1: Fetch the transcript using the TranscriptAPI
    console.log("Fetching transcript for video ID:", videoId);
    const transcriptArray = await TranscriptAPI.getTranscript(videoId);
    const transcriptText = transcriptArray.map((entry) => entry.text).join(" ");
    console.log("Transcript fetched successfully");

    // Predefined prompt in Spanish
    const prompt =
      "Con tono natural resume este video en español siendo conciso y claro en texto plano en un párrafo y sin saltos de línea:";
    const fullPrompt = `${prompt}\n\n${transcriptText}`;

    // Step 2: Generate summary using Google Generative AI
    console.log("Generating summary with custom prompt");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(fullPrompt);
    const summary = result.response?.text() || "No summary generated";

    res.status(200).json({ summary });
  } catch (error: any) {
    console.error("Error occurred during summary generation:", error);

    // Handle transcript errors
    if (
      error.message.includes("transcripts disabled for that video") ||
      error.message.includes("Transcript is disabled")
    ) {
      res
        .status(400)
        .json({ summary: "", error: "Transcript is disabled for this video." });
    } else if (error.code === "ECONNABORTED") {
      res
        .status(504)
        .json({ summary: "", error: "Request timed out. Please try again later." });
    } else {
      res
        .status(500)
        .json({ summary: "", error: `Error generating summary: ${error.message}` });
    }
  }
}
