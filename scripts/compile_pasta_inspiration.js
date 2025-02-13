const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Function to compile the data from CSV into a structured object
function compileData(filePath) {
  return new Promise((resolve, reject) => {
    const results = {
      _instructions: {
        description: "Pasta recipe inspiration sources across markets",
        dataCharacteristics: {
          marketCoverage: {
            core: ["Australia", "France", "Germany", "Greece", "United States"],
            inconsistent: ["Switzerland"],
          },
          inconsistencies: {
            marketSpecific: {
              Switzerland: {
                uniqueCategories: [
                  "Celebrity chef suggestion",
                  "Cooking magazines (Betty Bossi, Kochen)",
                  "Store cooking magazines (Fooby, Migusto)",
                  "Take away recipe booklets/folders from the store",
                ],
                missingData: [
                  "Cooking magazines",
                  "Store magazines",
                  "Celebrity chef suggestions",
                ],
                mapping: {
                  "Celebrity chef suggestion": "Celebrity chef suggestions",
                  "Cooking magazines (Betty Bossi, Kochen)":
                    "Cooking magazines",
                  "Store cooking magazines (Fooby, Migusto)": "Store magazines",
                  "Take away recipe booklets/folders from the store":
                    "Take away recipe booklets/leaflet",
                },
              },
            },
            missingData:
              "Switzerland has different categorization for some inspiration sources",
          },
          dataHandling: {
            rules: [
              "All percentages are converted to decimals (0-1)",
              "Empty or invalid values are skipped",
              "Swiss-specific categories are mapped to common categories where possible",
              "Net relative values preserved for each source",
            ],
          },
        },
      },
      ctm_inspiration_source: {},
    };

    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(),
        })
      )
      .on("data", (row) => {
        // Get the inspiration source from the first column
        const source = Object.values(row)[0];
        if (!source || source.includes("ctm_inspiration_source")) return;

        // Skip empty rows
        if (!source.trim()) return;

        // Create data object for this inspiration source
        const dataPoint = {
          Australia:
            parseFloat(row["au_respondent net relative"]?.replace("%", "")) /
            100,
          France:
            parseFloat(row["fr_respondent net relative"]?.replace("%", "")) /
            100,
          Germany:
            parseFloat(row["de_respondent net relative"]?.replace("%", "")) /
            100,
          Greece:
            parseFloat(row["gr_respondent net relative"]?.replace("%", "")) /
            100,
          Switzerland:
            parseFloat(row["ch_respondent net relative"]?.replace("%", "")) /
            100,
          "United States":
            parseFloat(row["us_respondent net relative"]?.replace("%", "")) /
            100,
        };

        // Clean up the data point by removing NaN values
        Object.keys(dataPoint).forEach((key) => {
          if (isNaN(dataPoint[key])) {
            delete dataPoint[key];
          }
        });

        // Only add source if it has valid data
        if (Object.keys(dataPoint).length > 0) {
          results.ctm_inspiration_source[source] = dataPoint;
        }
      })
      .on("end", () => {
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
const inputPath = path.join(__dirname, "data", "pasta_inspiration.csv");
const outputPath = path.join(__dirname, "vector", "pasta_inspiration.json");

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
