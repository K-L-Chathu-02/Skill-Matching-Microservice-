import React, { useState } from 'react';
import axios from 'axios';
import FileUpload from './components/fileUpload';
import './index.css';

function App() {
    const [jobDescription, setJobDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        setError(null);
    };

    const analyzeResume = async (analysisType) => {
        if (!selectedFile) {
            setError('Please upload a resume first');
            return;
        }

        if (!jobDescription.trim()) {
            setError('Please enter a job description');
            return;
        }

        setLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('jobDescription', jobDescription);
            formData.append('analysisType', analysisType);

            const response = await axios.post('http://localhost:5000/api/resume/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 60000, // 60 second timeout for analysis
            });

            if (response.data.success) {
                setAnalysis({
                    type: analysisType,
                    content: response.data.analysis
                });
            } else {
                setError(response.data.message || 'Analysis failed');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            if (err.code === 'ECONNABORTED') {
                setError('Request timeout. The analysis is taking too long. Please try again.');
            } else {
                setError(err.response?.data?.message || 'Failed to analyze resume. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const getAnalysisTitle = (type) => {
        switch (type) {
            case 'review':
                return 'Resume Review';
            case 'percentage':
                return 'ATS Match Percentage';
            default:
                return 'Analysis Result';
        }
    };

    return (
        <div className="container">
            <div className="header">
                <h1>🚀 ATS Resume Analyzer</h1>
                <div>
                    <span className="tech-badge">Node.js</span>
                    <span className="tech-badge">Express</span>
                    <span className="tech-badge">React</span>
                    <span className="tech-badge">Gemini AI</span>
                </div>
                <p>Node.js Edition - Powered by Google Gemini AI</p>
                <div className="backend-info">
                    Backend running on Node.js + Express | Frontend: React 18
                </div>
            </div>

            <div className="main-content">
                <div className="form-group">
                    <label htmlFor="jobDescription">Job Description:</label>
                    <textarea
                        id="jobDescription"
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the job description here..."
                    />
                </div>

                <div className="form-group">
                    <label>Upload Resume (PDF):</label>
                    <FileUpload onFileSelect={handleFileSelect} selectedFile={selectedFile} />
                </div>

                {error && (
                    <div className="error">
                        ⚠️ {error}
                    </div>
                )}

                <div className="button-group">
                    <button
                        className="btn btn-primary"
                        onClick={() => analyzeResume('review')}
                        disabled={loading}
                    >
                        📋 Tell Me About the Resume
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => analyzeResume('percentage')}
                        disabled={loading}
                    >
                        📊 Percentage Match
                    </button>
                </div>

                {loading && (
                    <div className="loading">
                        <div className="spinner"></div>
                        Analyzing your resume with Node.js backend and Gemini AI...
                    </div>
                )}
            </div>

            {analysis && (
                <div className="result">
                    <h2>{getAnalysisTitle(analysis.type)}</h2>
                    <div className="result-content">
                        {analysis.content}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
