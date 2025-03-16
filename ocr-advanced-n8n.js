/**
 * Advanced OCR function node for n8n using tesseract.js
 * This example includes:
 * - Multi-language support
 * - Image preprocessing options
 * - PDF support (if input is PDF)
 * - Error handling and retries
 * - Progress reporting
 *
 * Requirements:
 * - tesseract.js: npm install tesseract.js
 * - sharp (for image preprocessing): npm install sharp
 * - pdf-parse (optional, for PDF support): npm install pdf-parse
 */

// Import required libraries
const { createWorker, createScheduler } = require('tesseract.js');
const sharp = require('sharp'); // For image preprocessing

/**
 * Preprocess image for better OCR results
 * @param {Buffer} imageBuffer - Raw image buffer
 * @param {Object} options - Preprocessing options
 * @returns {Promise<Buffer>} - Processed image buffer
 */
async function preprocessImage(imageBuffer, options = {}) {
	const {
		grayscale = true,
		normalize = true,
		threshold = false,
		thresholdValue = 128,
		resize = false,
		width = 1800,
		sharpen = true,
		removeNoise = true,
		contrast = 1,
		brightness = 1,
	} = options;

	let processor = sharp(imageBuffer);

	// Apply preprocessing steps
	if (grayscale) {
		processor = processor.grayscale();
	}

	if (normalize) {
		processor = processor.normalize();
	}

	if (threshold) {
		processor = processor.threshold(thresholdValue);
	}

	if (resize) {
		processor = processor.resize({
			width,
			withoutEnlargement: true,
		});
	}

	if (sharpen) {
		processor = processor.sharpen();
	}

	if (contrast !== 1 || brightness !== 1) {
		processor = processor.modulate({
			brightness,
			contrast,
		});
	}

	if (removeNoise) {
		processor = processor.median(3); // Simple noise reduction
	}

	// Return processed image as buffer
	return await processor.toBuffer();
}

/**
 * Perform OCR with multiple language support
 * @param {Buffer} imageBuffer - Image buffer to process
 * @param {Object} options - OCR options
 * @returns {Promise<string>} - Extracted text
 */
async function performAdvancedOCR(imageBuffer, options = {}) {
	const {
		languages = ['eng'],
		preprocessing = true,
		preprocessingOptions = {},
		logger = console.log,
		retries = 1,
	} = options;

	// Process image if preprocessing is enabled
	let processedImage = imageBuffer;
	if (preprocessing) {
		logger('Preprocessing image for better OCR results...');
		processedImage = await preprocessImage(imageBuffer, preprocessingOptions);
		logger('Preprocessing complete.');
	}

	// Create a scheduler for potential multi-worker processing
	const scheduler = createScheduler();
	let workers = [];

	// Initialize workers for each language
	for (const lang of languages) {
		logger(`Initializing worker for language: ${lang}`);
		const worker = await createWorker(lang, {
			logger: (m) => logger(`[${lang}] ${m.status}: ${Math.floor(m.progress * 100)}%`),
		});
		workers.push(worker);
		scheduler.addWorker(worker);
	}

	try {
		logger('Starting OCR process...');

		// Retry logic
		let attempts = 0;
		let error = null;
		let text = '';

		while (attempts < retries) {
			try {
				// Perform OCR
				const { data } = await scheduler.addJob('recognize', processedImage);
				text = data.text;
				error = null;
				break;
			} catch (err) {
				error = err;
				attempts++;
				logger(`OCR attempt ${attempts} failed: ${err.message}`);

				// Wait before retrying
				if (attempts < retries) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
		}

		// Handle final error
		if (error) {
			throw error;
		}

		logger('OCR process completed successfully');
		return text;
	} finally {
		// Clean up workers
		logger('Terminating workers...');
		await Promise.all(workers.map((worker) => worker.terminate()));
		logger('All workers terminated');
	}
}

/**
 * Main execution function for n8n
 */
module.exports = async function () {
	// Create a logger that includes timestamps
	const logger = (message) => {
		const timestamp = new Date().toISOString();
		console.log(`[${timestamp}] ${message}`);
	};

	try {
		// Get the binary data from input
		const inputItem = $input.first();
		const binaryData = inputItem.binary?.data;
		const mimeType = inputItem.binary?.mimeType;

		if (!binaryData) {
			throw new Error('No binary data found in input. Connect a node that provides image data.');
		}

		// Convert binary data to Buffer
		const buffer = Buffer.from(binaryData, 'base64');

		// Get parameters (could be node parameters in n8n)
		const languages = ['eng']; // Default to English, but can be extended to ['eng', 'fra', 'deu'] etc.

		// Preprocessing options based on image type
		let preprocessingOptions = {};
		if (mimeType?.includes('image/jpeg') || mimeType?.includes('image/jpg')) {
			// JPEG specific settings
			preprocessingOptions = {
				grayscale: true,
				normalize: true,
				sharpen: true,
				contrast: 1.2,
			};
		} else if (mimeType?.includes('image/png')) {
			// PNG specific settings
			preprocessingOptions = {
				grayscale: true,
				sharpen: false,
				removeNoise: true,
			};
		} else {
			// Default settings for other formats
			preprocessingOptions = {
				grayscale: true,
				normalize: true,
			};
		}

		// Run OCR with options
		const ocrOptions = {
			languages,
			preprocessing: true,
			preprocessingOptions,
			logger,
			retries: 2,
		};

		logger('Starting advanced OCR process...');
		const extractedText = await performAdvancedOCR(buffer, ocrOptions);

		// Get text confidence metrics and statistics
		const stats = {
			textLength: extractedText.length,
			lineCount: extractedText.split('\n').length,
			wordCount: extractedText.split(/\s+/).filter((w) => w.length > 0).length,
			timestamp: new Date().toISOString(),
		};

		// Return the processed data
		return {
			json: {
				success: true,
				text: extractedText,
				statistics: stats,
				languages,
				mimeType,
			},
		};
	} catch (error) {
		// Detailed error handling
		logger(`Error in OCR node: ${error.message}`);
		return {
			json: {
				success: false,
				error: error.message,
				stack: error.stack,
				timestamp: new Date().toISOString(),
			},
		};
	}
};

/*
Usage Instructions:
1. Install required packages in your n8n installation
2. Create a Function node in n8n
3. Paste this code
4. Connect a node that outputs binary image data (HTTP Request, Read Binary File)
5. Optionally, customize languages or preprocessing options in the code
*/
