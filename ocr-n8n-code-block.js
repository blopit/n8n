/**
 * This is an example of how to use tesseract.js in an n8n Function node (Code block).
 * Before using this, you need to make sure tesseract.js is installed:
 * 1. Stop n8n if it's running
 * 2. Navigate to your n8n installation directory
 * 3. Run: npm install tesseract.js
 * 4. Restart n8n
 *
 * This code assumes you have an image input from a previous node,
 * like HTTP Request or Read Binary File node.
 */

// Code to use in your Function node
const { createWorker } = require('tesseract.js');

// Main async function
async function extractTextFromImage(imageBuffer, language = 'eng') {
	// Initialize the worker with specified language
	const worker = await createWorker(language);

	try {
		// Recognize the text from the image
		const {
			data: { text },
		} = await worker.recognize(imageBuffer);
		return text;
	} finally {
		// Always terminate the worker when done to free resources
		await worker.terminate();
	}
}

// Main execution of the function node
module.exports = async function () {
	try {
		// Get the binary data from the input - assumes 'data' is an image from previous node
		// This assumes you have connected a node that outputs binary data (like HTTP Request, Read Binary File)
		const binaryData = $input.first().binary?.data;

		if (!binaryData) {
			throw new Error(
				'No binary data found in input. Please connect a node that provides image data.',
			);
		}

		// Convert binary data to Buffer
		const imageBuffer = Buffer.from(binaryData, 'base64');

		// Set language - can also come from workflow data or node parameters
		const language = 'eng'; // English is default, but you can change to other languages tesseract supports

		// Run OCR on the image
		const extractedText = await extractTextFromImage(imageBuffer, language);

		// Return the result for the next node
		return {
			json: {
				success: true,
				text: extractedText,
			},
		};
	} catch (error) {
		// Handle any errors
		return {
			json: {
				success: false,
				error: error.message,
			},
		};
	}
};

/*
Example workflow setup:
1. HTTP Request node or Read Binary File node (to get an image)
2. Function node (with this code)
3. Any node to process the extracted text

Notes:
- For larger images or documents, processing may take some time
- Make sure the image is high quality for better OCR results
- You can add preprocessing before OCR for better results
*/
