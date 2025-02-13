const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Function to compile the data from CSV into a structured object
function compileData(filePath) {
  return new Promise((resolve, reject) => {
    const results = {
      jrn_trigger: {},
      ctm_occasion_in_mind: {},
    };

    let currentSection = null;
    let headers = null;

    fs.createReadStream(filePath)
      .pipe(
        csv({
          headers: false, // We'll handle headers manually
        })
      )
      .on("data", (row) => {
        // Convert row object to array
        const rowArray = Object.values(row);

        // Handle section headers
        if (rowArray[0].includes("jrn_trigger:")) {
          currentSection = "jrn_trigger";
          headers = rowArray;
          return;
        } else if (rowArray[0].includes("ctm_occasion_in_mind:")) {
          currentSection = "ctm_occasion_in_mind";
          headers = rowArray;
          return;
        }

        // Skip empty rows or rows without valid data
        if (
          !rowArray[0] ||
          currentSection === null ||
          rowArray[0].trim() === ""
        ) {
          return;
        }

        // Get the values, ensuring we handle missing or invalid values
        const fr = parseFloat((rowArray[1] || "0").replace("%", "")) / 100;
        const de = parseFloat((rowArray[2] || "0").replace("%", "")) / 100;
        const gr = parseFloat((rowArray[3] || "0").replace("%", "")) / 100;
        const net = parseFloat((rowArray[4] || "0").replace("%", "")) / 100;

        // Only process rows with valid data
        if (isNaN(fr) || isNaN(de) || isNaN(gr)) {
          return;
        }

        // Create data object for this trigger/occasion
        const dataPoint = {
          France: fr,
          Germany: de,
          Greece: gr,
        };

        // Add net_relative if it exists and is valid
        if (!isNaN(net)) {
          dataPoint.net_relative = net;
        }

        // Add to appropriate section
        if (currentSection === "jrn_trigger") {
          results.jrn_trigger[rowArray[0]] = dataPoint;
        } else if (currentSection === "ctm_occasion_in_mind") {
          results.ctm_occasion_in_mind[rowArray[0]] = dataPoint;
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
const inputPath = path.join(__dirname, "data", "biscuit_trigger_occasion.csv");
const outputPath = path.join(
  __dirname,
  "vector",
  "biscuits_trigger_occasion.json"
);

compileData(inputPath)
  .then((data) => {
    writeToJson(data, outputPath);
  })
  .catch((err) => {
    console.error("Error processing CSV:", err);
  });
