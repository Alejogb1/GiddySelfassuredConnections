import { YoutubeTranscript } from "youtube-transcript";

export default async function handler(req, res) {
  const { videoId } = req.query;

  try {
    // Fetch transcript using YoutubeTranscript.fetchTranscript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    // Concatenate all entries into a single string
    const transcriptText = transcript.map((entry) => entry.text).join(" ");

    res.status(200).json({ transcript: transcriptText });
  } catch (error) {
    console.error("Error fetching transcript:", error);
    res.status(500).json({ error: "Error fetching transcript" });
  }
}
