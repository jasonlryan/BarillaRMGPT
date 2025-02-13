const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Mapping of country prefixes to full names
const countryNames = {
  fr_: "France",
  de_: "Germany",
  gr_: "Greece",
};

// Function to compile the data from CSV into a flat list of objects
function compileData(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const countryPrefixes = ["fr_", "de_", "gr_"];

    // Create a nested data structure like in Python
    const data = {};

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
        const allAvgeIndex = parseFloat(row["all_avge_index"]) || 0;

        // Process each country's data
        countryPrefixes.forEach((prefix) => {
          const country = countryNames[prefix];
          const index = parseFloat(row[`${prefix}index`]) || 0;
          const dfm = parseFloat(row[`${prefix}dfm_by_chnl`]) || 0;

          // Initialize nested structure if needed
          if (!data[country]) {
            data[country] = {};
          }
          if (!data[country][phase]) {
            data[country][phase] = {};
          }

          // Store data in nested structure like Python
          data[country][phase][touchpoint] = {
            Channel: channel,
            index: index,
            dfm_by_chnl: dfm,
            all_avge_index: allAvgeIndex,
          };
        });
      })
      .on("end", () => {
        // Convert nested structure to flat list like Python
        for (const [country, phases] of Object.entries(data)) {
          for (const [phase, touchpoints] of Object.entries(phases)) {
            for (const [touchpoint, metrics] of Object.entries(touchpoints)) {
              results.push({
                country: country,
                stage: phase,
                touchpoint: touchpoint,
                channel: metrics.Channel,
                index: metrics.index,
                "deviation from mean": metrics.dfm_by_chnl,
                "category average index": metrics.all_avge_index,
              });
            }
          }
        }

        // Sort results
        results.sort((a, b) => {
          const countryCompare = (a.country || "").localeCompare(
            b.country || ""
          );
          if (countryCompare !== 0) return countryCompare;

          const stageCompare = (a.stage || "").localeCompare(b.stage || "");
          if (stageCompare !== 0) return stageCompare;

          return (a.touchpoint || "").localeCompare(b.touchpoint || "");
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
const inputPath = path.join(__dirname, "data", "biscuits_fr_de_gr.csv");
const outputPath = path.join(__dirname, "vector", "biscuits_data.json");

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
