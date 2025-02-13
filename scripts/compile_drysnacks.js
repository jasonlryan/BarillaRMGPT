const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Function to compile the data from CSV into a flat list of objects
function compileData(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(),
        })
      )
      .on("data", (row) => {
        // Extract common fields
        const touchpoint = row["Touchpoint"];
        const phase = row["Phase"];
        const channel =
          row["Channel"] === "D"
            ? "Digital"
            : row["Channel"] === "O"
            ? "Offline"
            : "Hybrid";

        // Process Italian data
        const dataPoint = {
          country: "Italy",
          stage: phase,
          touchpoint: touchpoint,
          channel: channel,
          index: parseFloat(row.it_index),
          "deviation from mean": parseFloat(row.it_dfm_by_chnl),
          "category average index": parseFloat(row.all_avge_index),
        };
        results.push(dataPoint);
      })
      .on("end", () => {
        // Sort results
        results.sort((a, b) => {
          const stageCompare = (a.stage || "").localeCompare(b.stage || "");
          if (stageCompare !== 0) return stageCompare;

          // Sort by index in descending order within each stage
          return b.index - a.index;
        });

        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

// Function to write the output JSON file
function writeToJson(data, outputPath) {
  // Ensure the output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Data has been successfully written to ${outputPath}`);
}

// Main execution
const inputPath = path.join(__dirname, "data", "drysnacks_it.csv");
const outputPath = path.join(__dirname, "vector", "drysnacks_data.json");

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
