const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Function to compile the data from CSV into a structured object
function compileData(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const categoryMap = {
      redsauce: "red_sauce",
      pesto: "pesto_sauce",
      meat: "meat_sauce",
      tomato: "red_sauce", // Map tomato to red sauce category
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
        // Get the need statement from the first column
        const need = Object.values(row)[0];
        if (!need || need.includes("ctm_sauce_needs:")) return;

        // Process each country and category combination
        Object.entries(row).forEach(([key, value]) => {
          // Skip if not a response column
          if (!key.includes("_respondent")) return;

          // Extract country and category from column name
          const [country, category] = key.split("_");
          if (!countryMap[country]) return;

          // Skip if not a specific sauce category
          if (!categoryMap[category]) return;

          // Convert percentage to decimal and handle empty values
          if (!value || value.trim() === "") return;
          const responseRate = parseFloat(value.replace("%", "")) / 100;
          if (isNaN(responseRate)) return;

          results.push({
            category: categoryMap[category],
            need: need,
            country: countryMap[country],
            response_rate: responseRate,
          });
        });
      })
      .on("end", () => {
        // Sort results by category, country, and response rate
        results.sort((a, b) => {
          const catCompare = a.category.localeCompare(b.category);
          if (catCompare !== 0) return catCompare;

          const countryCompare = a.country.localeCompare(b.country);
          if (countryCompare !== 0) return countryCompare;

          return b.response_rate - a.response_rate;
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
const inputPath = path.join(__dirname, "data", "all_sauce_needs.csv");
const outputPath = path.join(
  __dirname,
  "vector",
  "redsauce_pesto_meatsauce_needs.json"
);

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
