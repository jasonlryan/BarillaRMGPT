const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Function to compile the data from CSV into a structured object
function compileData(filePath) {
  return new Promise((resolve, reject) => {
    const results = {
      _documentation: {
        description:
          "Purchase triggers across sauce categories with standardized inconsistency documentation",
        inconsistencies: {
          marketCoverage: {
            limitations: ["France", "Germany", "Italy"],
            gaps: {
              meat_sauce: ["Germany"],
              pesto_sauce: [],
            },
            rationale:
              "Core markets for sauce categories with established retail presence",
          },
          dataStructure: {
            mappings: {
              redsauce: "red_sauce",
              tomato: "red_sauce",
              bolegnese: "meat_sauce",
              pesto: "pesto_sauce",
              meat: "meat_sauce",
            },
            variations: [
              "Some categories have market-specific response patterns",
              "Meat sauce data limited to France and Italy",
              "Category naming varies between source and normalized data",
            ],
          },
          marketSpecific: {
            patterns: {
              Italy: "Higher response rates for traditional sauce categories",
              France: "More diverse category engagement",
              Germany: "Limited meat sauce data",
            },
            uniqueFields: {},
            missingFields: {
              Germany: ["meat_sauce_responses"],
            },
          },
        },
        relationships: {
          categoryConnections: [
            "red_sauce → redsauce_data.json",
            "pesto_sauce → pestosauce_data.json",
            "meat_sauce → meatsauce_data.json",
          ],
          dataLinks: {
            performance_data: {
              red_sauce: "redsauce_data.json",
              pesto_sauce: "pestosauce_data.json",
              meat_sauce: "meatsauce_data.json",
            },
          },
          dependencies: [
            "Category performance metrics in respective data files",
            "Market presence in performance data files",
          ],
        },
      },
    };

    const categoryMap = {
      redsauce: "red_sauce",
      pesto: "pesto_sauce",
      meat: "meat_sauce",
      bolegnese: "meat_sauce", // Map bolognese to meat sauce category
    };

    const countryMap = {
      fr: "France",
      de: "Germany",
      it: "Italy",
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

        // Process each country and category combination
        Object.entries(row).forEach(([key, value]) => {
          // Skip if not a response column
          if (!key.includes("_respondent")) return;

          // Extract country and category from column name
          const [country, category] = key.split("_");
          if (!countryMap[country]) return;

          // Skip if not a specific sauce category
          if (!categoryMap[category]) return;

          // Convert percentage to decimal
          const responseRate = parseFloat(value.replace("%", "")) / 100;
          if (isNaN(responseRate)) return;

          // Add to results array with normalized category name
          if (!results.data) {
            results.data = [];
          }
          results.data.push({
            category: categoryMap[category],
            trigger: trigger,
            country: countryMap[country],
            response_rate: responseRate,
          });
        });
      })
      .on("end", () => {
        // Sort results by category, country, and response rate
        if (results.data) {
          results.data.sort((a, b) => {
            const catCompare = a.category.localeCompare(b.category);
            if (catCompare !== 0) return catCompare;

            const countryCompare = a.country.localeCompare(b.country);
            if (countryCompare !== 0) return countryCompare;

            return b.response_rate - a.response_rate;
          });
        }

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
const inputPath = path.join(__dirname, "data", "all_sauce_triggers.csv");
const outputPath = path.join(
  __dirname,
  "vector",
  "redsauce_pesto_meatsauce_triggers.json"
);

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
