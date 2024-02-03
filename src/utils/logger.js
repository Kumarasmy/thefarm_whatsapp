const { createLogger, transports, format } = require("winston");
const fs = require("fs").promises; // Use fs.promises for asynchronous file operations
const path = require("path");

const logDir = "src/logs"; // directory
const maxAgeInDays = 2;

// Create the log directory if it doesn't exist
async function createLogDir() {
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    console.error("Error creating log directory:", error.message);
  }
}

// Function to get the log file name with the current date
function getLogFileName() {
  const currentDate = new Date().toISOString().slice(0, 10); // Get YYYY-MM-DD format
  return path.join(logDir, `${currentDate}.log`);
}

// Function to clean up old log files

async function cleanupLogs() {
  try {
    const files = await fs.readdir(logDir);

    const maxAgeTimestamp = Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000; // in milliseconds

    for (const file of files) {
      const filePath = path.join(logDir, file);
      const fileStat = await fs.stat(filePath);

      if (fileStat.isFile() && fileStat.mtimeMs < maxAgeTimestamp) {
        await fs.unlink(filePath);
        console.log(`Deleted old log file: ${filePath}`);
      }
    }
  } catch (error) {
    console.error("Error during log cleanup:", error.message);
  }
}

// Initialize log directory creation and log cleanup asynchronously
// async function initialize() {
//   await createLogDir();
//   cleanupLogs(); // You can choose to run this synchronously or asynchronously
// }

const logger = createLogger({
  transports: [
    new transports.Console({
      format: format.combine(format.cli()),
    }),
    new transports.File({
      filename: getLogFileName(),
      maxsize: 10485760, // 10 MB, adjust as needed
      maxFiles: 3,
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
});

module.exports = {
        logger
}

