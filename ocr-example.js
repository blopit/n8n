// OCR Example using tesseract.js in n8n
const { createWorker } = require('tesseract.js');

/**
 * Example function to perform OCR on an image
 * @param {Buffer|string} image - The image to perform OCR on (Buffer or file path)
 * @param {string} lang - The language for OCR (default: 'eng')
 * @returns {Promise<string>} - The recognized text
 */
async function performOCR(image, lang = 'eng') {
  console.log('Initializing Tesseract worker...');

  // Create a worker
  const worker = await createWorker(lang);

  try {
    // Recognize text from image
    console.log('Processing image...');
    const { data: { text } } = await worker.recognize(image);
    console.log('OCR completed successfully');
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  } finally {
    // Always terminate the worker when done
    await worker.terminate();
    console.log('Tesseract worker terminated');
  }
}

// Usage example
async function main() {
  try {
    // Example 1: OCR from a local file path
    const textFromFile = await performOCR('./sample-image.png');
    console.log('Text from file:', textFromFile);

    // Example 2: OCR from a URL (requires additional handling)
    // To use a URL, you need to fetch the image first
    /*
    const response = await fetch('https://example.com/image.jpg');
    const imageBuffer = await response.arrayBuffer();
    const textFromUrl = await performOCR(Buffer.from(imageBuffer));
    console.log('Text from URL:', textFromUrl);
    */
  } catch (error) {
    console.error('Error in main:', error);
  }
}

// Run the example
// Comment this out if you're using this file as a module
// main();

// Export the OCR function for use in n8n nodes
module.exports = {
  performOCR
};
