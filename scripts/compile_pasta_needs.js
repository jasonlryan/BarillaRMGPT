const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Function to compile the data from CSV into a structured object
function compileData(filePath) {
  return new Promise((resolve, reject) => {
    const results = {
      _instructions: {
        description: "Pasta needs and consideration data across markets",
        dataCharacteristics: {
          marketCoverage: {
            core: [
              "Australia",
              "France",
              "Germany",
              "Greece",
              "Switzerland",
              "United States",
              "Turkey",
            ],
          },
          dataHandling: {
            rules: [
              "All percentages are converted to decimals (0-1)",
              "Empty or invalid values are skipped",
              "Net relative values preserved for each need statement",
            ],
          },
        },
      },
      cnt_needs: {},
    };

    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(),
        })
      )
      .on("data", (row) => {
        // Get the need statement from the first column, regardless of its exact header name
        const needStatement = Object.values(row)[0];
        if (!needStatement || needStatement.includes("cnt_needs")) return;

        // Create data object for this need statement
        const dataPoint = {
          Australia:
            parseFloat(row["au_respondent net relative"].replace("%", "")) /
            100,
          France:
            parseFloat(row["fr_respondent net relative"].replace("%", "")) /
            100,
          Germany:
            parseFloat(row["de_respondent net relative"].replace("%", "")) /
            100,
          Greece:
            parseFloat(row["gr_respondent net relative"].replace("%", "")) /
            100,
          Switzerland:
            parseFloat(row["ch_respondent net relative"].replace("%", "")) /
            100,
          "United States":
            parseFloat(row["us_respondent net relative"].replace("%", "")) /
            100,
          Turkey:
            parseFloat(row["tu_respondent net relative"].replace("%", "")) /
            100,
        };

        // Only add need statement if it has valid data
        if (Object.values(dataPoint).some((val) => !isNaN(val))) {
          results.cnt_needs[needStatement] = dataPoint;
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
const inputPath = path.join(__dirname, "data", "pasta_needs.csv");
const outputPath = path.join(__dirname, "vector", "pasta_needs.json");

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
