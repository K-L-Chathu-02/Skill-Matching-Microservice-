const pdf = require('pdf-poppler');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class ResumeService {
    constructor() {
        this.googleApiKey = process.env.GOOGLE_API_KEY;
        this.popplerPath = process.env.POPPLER_PATH;

        if (!this.googleApiKey) {
            throw new Error('GOOGLE_API_KEY is required in environment variables');
        }

        // Initialize Google Generative AI
        this.genAI = new GoogleGenerativeAI(this.googleApiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async analyzeResume({ filePath, jobDescription, analysisType }) {
        try {
            // Convert PDF to image
            const base64Image = await this.convertPdfToBase64Image(filePath);

            // Get prompt based on analysis type
            const prompt = this.getPromptByType(analysisType);

            // Call Gemini API
            const analysis = await this.callGeminiAPI(jobDescription, base64Image, prompt);

            return {
                success: true,
                analysis: analysis,
                analysisType: analysisType
            };
        } catch (error) {
            console.error('Resume analysis error:', error);
            throw new Error(`Analysis failed: ${error.message}`);
        }
    }

    async convertPdfToBase64Image(pdfPath) {
        try {
            const outputDir = path.join(__dirname, '../temp');

            // Create temp directory if it doesn't exist
            fs.mkdirSync(outputDir, { recursive: true });

            const options = {
                format: 'jpeg',
                out_dir: outputDir,
                out_prefix: 'page',
                page: 1,
                quality: 100
            };

            // Set poppler path if provided
            if (this.popplerPath) {
                options.poppler_path = this.popplerPath;
            }

            console.log('Converting PDF with options:', options);
            console.log('PDF path:', pdfPath);

            // Convert PDF to image
            const result = await pdf.convert(pdfPath, options);
            console.log('PDF conversion result:', result);

            // Check what files are actually in the temp directory
            const tempFiles = fs.readdirSync(outputDir);
            console.log('Files in temp directory after conversion:', tempFiles);

            // Find the actual image file (it might have a different name)
            const imageFiles = tempFiles.filter(file => file.includes('page') && file.endsWith('.jpg'));
            console.log('Image files found:', imageFiles);

            if (imageFiles.length === 0) {
                throw new Error('No image files generated from PDF conversion');
            }

            // Use the first (and should be only) image file found
            const actualImagePath = path.join(outputDir, imageFiles[0]);
            console.log('Using image file:', actualImagePath);

            if (!fs.existsSync(actualImagePath)) {
                throw new Error(`Image file not found at: ${actualImagePath}`);
            }

            // Read image and convert to base64 using fs.readFileSync as fallback
            let base64Image;
            try {
                // Try using Jimp first
                const image = await Jimp.read(actualImagePath);
                const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
                base64Image = buffer.toString('base64');
            } catch (jimpError) {
                console.log('Jimp failed, using fs.readFileSync fallback:', jimpError.message);
                // Fallback to direct file reading
                const imageBuffer = fs.readFileSync(actualImagePath);
                base64Image = imageBuffer.toString('base64');
            }

            // Clean up temporary files
            tempFiles.forEach(file => {
                const filePath = path.join(outputDir, file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });

            console.log('PDF conversion completed successfully');
            return base64Image;

        } catch (error) {
            console.error('PDF conversion error:', error);
            console.error('Error stack:', error.stack);

            // Log temp directory contents for debugging
            try {
                const outputDir = path.join(__dirname, '../temp');
                if (fs.existsSync(outputDir)) {
                    const tempFiles = fs.readdirSync(outputDir);
                    console.log('Temp directory contents during error:', tempFiles);
                }
            } catch (debugError) {
                console.error('Could not read temp directory during error:', debugError);
            }

            throw new Error(`Failed to convert PDF: ${error.message}`);
        }
    }

    getPromptByType(analysisType) {
        switch (analysisType.toLowerCase()) {
            case 'review':
                return `You are an experienced Technical Human Resource Manager, your task is to review the provided resume against the job description. 
Please share your professional evaluation on whether the candidate's profile aligns with the role. 
Highlight the strengths and weaknesses of the applicant in relation to the specified job requirements.`;

            case 'percentage':
                return `You are a skilled ATS (Applicant Tracking System) scanner with a deep understanding of data science and ATS functionality, 
your task is to evaluate the resume against the provided job description. Give me the percentage of match if the resume matches
the job description. First the output should come as percentage and then keywords missing and last final thoughts.`;

            default:
                return 'Please analyze this resume against the job description.';
        }
    }

    async callGeminiAPI(jobDescription, base64Image, prompt) {
        try {
            const imagePart = {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg"
                }
            };

            const textPart = `${prompt}\n\nJob Description: ${jobDescription}`;

            const result = await this.model.generateContent([textPart, imagePart]);
            const response = await result.response;
            const text = response.text();

            if (!text) {
                throw new Error('No response text from Gemini API');
            }

            return text;
        } catch (error) {
            console.error('Gemini API error:', error);

            if (error.message?.includes('API_KEY')) {
                throw new Error('Invalid API key. Please check your Google API key.');
            } else if (error.message?.includes('QUOTA_EXCEEDED')) {
                throw new Error('API quota exceeded. Please try again later.');
            } else if (error.message?.includes('RATE_LIMIT')) {
                throw new Error('API rate limit exceeded. Please try again later.');
            }

            throw new Error(`Gemini API call failed: ${error.message}`);
        }
    }
}

module.exports = new ResumeService();
