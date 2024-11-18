const fs = require("fs").promises; // Use promises API for fs
const path = require("path");
const youtubedl = require("youtube-dl-exec");
const Promise = require("bluebird");

const videos = [
  { youtube_id: "WlTW05gltmQ", captioned: "No" },
  { youtube_id: "dQw4w9WgXcQ", captioned: "No" },
];

async function cleanVttFile(inputFilePath, outputFilePath) {
  try {
    // Read the file
    let data = await fs.readFile(inputFilePath, "utf8");

    // Throw away the header, which ends with "##\n"
    const headerSplitIndex = data.indexOf("##\n");
    if (headerSplitIndex !== -1) {
      data = data.slice(headerSplitIndex + 3); // Remove the header
    }

    // Remove timestamps in the form "00:00:01.819 --> 00:00:01.829 align:start position:0%"
    data = data.replace(
      /\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3} align:start position:0%\n/g,
      ""
    );

    // Remove color changes like "<c.colorE5E5E5>"
    data = data.replace(/<c\.color[0-9A-Z]{6}>/g, "");

    // Remove other timestamp markers, e.g., "</c><00:00:00.539><c>"
    data = data.replace(
      /(?:<\/c>)?(?:<\d{2}:\d{2}:\d{2}\.\d{3}>)?(?:<c>)?/g,
      ""
    );

    // Remove timestamps in the form "00:00:03.500 --> 00:00:03.510"
    data = data.replace(
      /\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\n/g,
      ""
    );

    // Get distinct lines, trimming whitespace and removing empty lines
    const lines = data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    // Remove duplicates while preserving order
    const uniqueLines = [...new Set(lines)];

    // Write cleaned-up data to the output file
    await fs.writeFile(outputFilePath, uniqueLines.join("\n"), "utf8");

    console.log(`Cleaned subtitles saved to ${outputFilePath}`);
  } catch (error) {
    console.error(`Error cleaning VTT file: ${error.message}`);
    throw error;
  }
}
Promise.map(
  videos,
  async function (v) {
    if (v.captioned === "No") {
      const url = `https://youtu.be/${v.youtube_id}`;
      console.log(`Processing: ${url}`);

      const outputDir = path.join(__dirname, "auto_generated_captions");
      const inputFilePath = path.join(outputDir, `${v.youtube_id}.vtt`);
      const outputFilePath = path.join(
        outputDir,
        `${v.youtube_id}_formatted.txt`
      );

      const options = {
        writeAutoSub: true,
        subLang: "en",
        output: inputFilePath,
      };

      try {
        // Ensure the output directory exists
        await fs.mkdir(outputDir, { recursive: true });

        // Download the subtitles
        await youtubedl(url, options);
        console.log(`Downloaded subtitles for ${v.youtube_id}`);

        // Format the transcript
        await cleanVttFile(inputFilePath, outputFilePath);

        console.log(`Formatted subtitles saved for ${v.youtube_id}`);
      } catch (error) {
        console.error(`Error processing ${v.youtube_id}:`, error);
      }
    } else {
      console.log(`Skipping ${v.youtube_id}, already captioned.`);
    }
  },
  { concurrency: 5 }
)
  .then(() => {
    console.log("All downloads and formatting completed!");
  })
  .catch((err) => {
    console.error("Error during processing:", err);
  });
