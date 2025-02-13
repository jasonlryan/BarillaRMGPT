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
        const touchpoint =
          row[
            "jrn_importance: How important were each of these steps in determining your final purchase decision?"
          ];
        const phase = row["Phase"];
        const channel =
          row["Channel"] === "D"
            ? "Digital"
            : row["Channel"] === "O"
            ? "Offline"
            : "Hybrid";

        // Process data for each country
        const countries = ["fr", "de", "it"];
        const countryNames = {
          fr: "France",
          de: "Germany",
          it: "Italy",
        };

        countries.forEach((countryCode) => {
          // Only create data point if index exists for this country
          if (row[`${countryCode}_index`]) {
            const dataPoint = {
              country: countryNames[countryCode],
              stage: phase,
              touchpoint: touchpoint,
              channel: channel,
              index: parseFloat(row[`${countryCode}_index`]),
              "deviation from mean": parseFloat(
                row[`${countryCode}_dfm_by_chnl`]
              ),
            };

            // Only add category average index if it exists
            if (row.all_avge_index) {
              dataPoint["category average index"] = parseFloat(
                row.all_avge_index
              );
            }

            // Only add valid data points
            if (!isNaN(dataPoint.index)) {
              results.push(dataPoint);
            }
          }
        });
      })
      .on("end", () => {
        // Sort results
        results.sort((a, b) => {
          // First sort by country
          const countryCompare = (a.country || "").localeCompare(
            b.country || ""
          );
          if (countryCompare !== 0) return countryCompare;

          // Then by stage
          const stageCompare = (a.stage || "").localeCompare(b.stage || "");
          if (stageCompare !== 0) return stageCompare;

          // Finally by index in descending order
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
const inputPath = path.join(__dirname, "data", "pesto_sauce.csv");
const outputPath = path.join(__dirname, "vector", "pestosauce_data.json");

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
