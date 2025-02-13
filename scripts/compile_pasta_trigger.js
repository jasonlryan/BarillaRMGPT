const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

/**
 * Pasta Trigger Data Processing Script
 *
 * Data Structure:
 * - Input: CSV file with trigger questions and country-specific responses
 * - Output: JSON with normalized trigger data
 *
 * Data Characteristics:
 * 1. Market Coverage:
 *    - Core markets: Australia, France, Germany, Greece, Switzerland, US
 *    - Additional markets: Turkey, Italy
 *    - Not all triggers are present in all markets
 *
 * 2. Data Inconsistencies:
 *    - Turkey has unique triggers (e.g., "I was discussing food at home...")
 *    - Italy has market-specific triggers (e.g., "Pasta is always on my shopping list")
 *    - Some common triggers have missing data for certain markets
 *
 * 3. Data Handling Rules:
 *    - Countries with no data for a trigger are excluded (no zero/null values)
 *    - Market-specific triggers are preserved with their limited market data
 *    - All percentages are converted to decimals
 *    - Empty or invalid values are skipped
 *
 * Output Format:
 * {
 *   "jrn_trigger": {
 *     "trigger_text": {
 *       "Country1": decimal_value,
 *       "Country2": decimal_value
 *       // Only countries with valid data are included
 *     }
 *   }
 * }
 */

// Mapping of country codes to full names
const countryNames = {
  au_: "Australia",
  fr_: "France",
  de_: "Germany",
  gr_: "Greece",
  ch_: "Switzerland",
  us_: "United States",
  tu_: "Turkey",
  it_: "Italy",
};

// Function to compile the trigger data from CSV into a structured object
function compileData(filePath) {
  return new Promise((resolve, reject) => {
    const results = {
      _instructions: {
        description: "Pasta purchase trigger data across markets",
        dataCharacteristics: {
          marketCoverage: {
            core: [
              "Australia",
              "France",
              "Germany",
              "Greece",
              "Switzerland",
              "United States",
            ],
            additional: ["Turkey", "Italy"],
          },
          inconsistencies: {
            marketSpecific: {
              Turkey: [
                "I was discussing food at home and it reminded me to buy",
                "I was inspired to try a recipe I saw on a cookings show",
                "I was inspired to try a recipe I saw online, on social media or through influencers",
              ],
              Italy: [
                "Pasta is always on my shopping list",
                "I bought a premium ingredient to go with pasta",
                "I needed to prepare pasta dish for a meal out with my family or friends",
              ],
            },
            missingData:
              "Some triggers have incomplete market coverage. Markets with no data are excluded.",
          },
          dataHandling: {
            rules: [
              "Countries with no data for a trigger are excluded (no zero/null values)",
              "Market-specific triggers are preserved with their limited market data",
              "All percentages are converted to decimals (0-1)",
              "Empty or invalid values are skipped",
            ],
          },
        },
      },
      jrn_trigger: {},
    };

    fs.createReadStream(filePath)
      .pipe(
        csv({
          headers: false, // We'll handle headers manually
        })
      )
      .on("data", (row) => {
        // Convert row object to array
        const rowArray = Object.values(row);
        const firstColumn = rowArray[0]?.trim() || "";

        // Skip header row or empty rows
        if (firstColumn.includes("jrn_trigger:") || !firstColumn) {
          return;
        }

        // Create data object for this trigger
        const dataPoint = {};

        // Process each country's data
        // Starting from index 1 as index 0 is the trigger text
        // Order matches CSV: au, fr, de, gr, ch, us, tu, it
        const countryPrefixes = [
          "au_",
          "fr_",
          "de_",
          "gr_",
          "ch_",
          "us_",
          "tu_",
          "it_",
        ];

        countryPrefixes.forEach((prefix, index) => {
          const value = rowArray[index + 1];
          // Only add country if it has valid data
          if (value && value.trim() !== "") {
            const percentage = parseFloat(value.replace("%", "")) / 100;
            if (!isNaN(percentage)) {
              dataPoint[countryNames[prefix]] = percentage;
            }
          }
        });

        // Only add trigger if it has data for at least one country
        if (Object.keys(dataPoint).length > 0) {
          results.jrn_trigger[firstColumn] = dataPoint;
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
const inputPath = path.join(__dirname, "data", "pasta_trigger.csv");
const outputPath = path.join(__dirname, "vector", "pasta_trigger.json");

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
