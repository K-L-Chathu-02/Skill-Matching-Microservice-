const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const resumeService = require('../services/resumeService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// POST /api/resume/analyze
router.post('/analyze', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a PDF file'
            });
        }

        const { jobDescription, analysisType } = req.body;

        if (!jobDescription || !analysisType) {
            return res.status(400).json({
                success: false,
                message: 'Job description and analysis type are required'
            });
        }

        const filePath = req.file.path;

        try {
            const result = await resumeService.analyzeResume({
                filePath,
                jobDescription,
                analysisType
            });

            // Clean up uploaded file
            fs.unlinkSync(filePath);

            res.json({
                success: true,
                message: 'Analysis completed successfully',
                analysis: result.analysis,
                analysisType: analysisType
            });

        } catch (analysisError) {
            // Clean up uploaded file even if analysis fails
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            throw analysisError;
        }

    } catch (error) {
        console.error('Resume analysis error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to analyze resume'
        });
    }
});

// GET /api/resume/health
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Resume Analysis API',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
