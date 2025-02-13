const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Function to compile the data from CSV into a structured object
function compileData(filePath) {
  return new Promise((resolve, reject) => {
    const results = {
      _instructions: {
        description: "Dry snacks purchase trigger data for Italian market",
        dataCharacteristics: {
          marketCoverage: {
            core: ["Italy"],
          },
          dataHandling: {
            rules: [
              "All percentages are converted to decimals (0-1)",
              "Empty or invalid values are skipped",
              "Net relative values preserved for each trigger",
            ],
          },
        },
      },
      jrn_trigger: {},
    };

    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(),
        })
      )
      .on("data", (row) => {
        // Get the trigger text from the first column
        const trigger = Object.values(row)[0];
        if (!trigger || trigger.includes("jrn_trigger:")) return;

        // Get the response rate for Italy
        const responseRate =
          parseFloat(row["it_respondent net relative"]?.replace("%", "")) / 100;
        if (isNaN(responseRate)) return;

        // Add to results if valid
        results.jrn_trigger[trigger] = {
          Italy: responseRate,
        };
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
const inputPath = path.join(__dirname, "data", "dry_snacks_trigger.csv");
const outputPath = path.join(__dirname, "vector", "drysnacks_trigger.json");

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
