document.addEventListener('DOMContentLoaded', () => {
    
    // ==============================================
    // 1. MOBILE MENU TOGGLE
    // ==============================================
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            menuToggle.textContent = nav.classList.contains('active') ? '✕' : '☰';
        });

        // Close menu when clicking a link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                menuToggle.textContent = '☰';
            });
        });
    }

    // ==============================================
    // 2. SCROLL REVEAL ANIMATION
    // ==============================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // ==============================================
    // 3. FAQ ACCORDION
    // ==============================================
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            
            // Toggle active state
            question.classList.toggle('active');
            
            if (question.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = 0;
            }
            
            // Close other items (Optional - Accordion style)
            faqQuestions.forEach(otherQuestion => {
                if (otherQuestion !== question && otherQuestion.classList.contains('active')) {
                    otherQuestion.classList.remove('active');
                    otherQuestion.nextElementSibling.style.maxHeight = 0;
                }
            });
        });
    });

    // ==============================================
    // 4. MODAL LOGIC
    // ==============================================
    const modalButtons = document.querySelectorAll('[data-modal-target]');
    const closeButtons = document.querySelectorAll('[data-modal-close]');
    
    modalButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-modal-target');
            const modal = document.getElementById(targetId + '-modal');
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            }
        });
    });
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        });
    });

    // Close on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });
    });

    // ==============================================
    // 5. BACKEND WIRING (Mugshot Maker)
    // ==============================================
    
    // --- UTILITY FUNCTIONS ---

    // Generate nanoid for unique filename
    function generateNanoId(length = 21) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Upload file to CDN storage (called immediately when file is selected)
    async function uploadFile(file) {
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueId = generateNanoId();
        // Filename is just nanoid.extension (no media/ prefix unless required)
        const fileName = uniqueId + '.' + fileExtension;
        
        // Step 1: Get signed URL from API
        // Endpoint: https://api.chromastudio.ai/get-emd-upload-url?fileName=...
        const signedUrlResponse = await fetch(
            'https://api.chromastudio.ai/get-emd-upload-url?fileName=' + encodeURIComponent(fileName),
            { method: 'GET' }
        );
        
        if (!signedUrlResponse.ok) {
            throw new Error('Failed to get signed URL: ' + signedUrlResponse.statusText);
        }
        
        const signedUrl = await signedUrlResponse.text();
        console.log('Got signed URL');
        
        // Step 2: PUT file to signed URL
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file: ' + uploadResponse.statusText);
        }
        
        // Step 3: Return download URL
        // Domain: contents.maxstudio.ai
        const downloadUrl = 'https://contents.maxstudio.ai/' + fileName;
        console.log('Uploaded to:', downloadUrl);
        return downloadUrl;
    }

    // Store the uploaded URL globally
    let currentUploadedUrl = null;

    // Submit generation job (Image or Video)
    async function submitImageGenJob(imageUrl) {
        // Config: Model=image-effects, Tool=image-effects, Effect=mugshot
        const isVideo = 'image-effects' === 'video-effects'; // Evaluates to false
        const endpoint = isVideo ? 'https://api.chromastudio.ai/video-gen' : 'https://api.chromastudio.ai/image-gen';
        
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            'sec-ch-ua-mobile': '?0'
        };

        // Construct payload based on type
        let body = {};
        if (isVideo) {
            body = {
                imageUrl: [imageUrl],
                effectId: 'mugshot',
                userId: 'DObRu1vyStbUynoQmTcHBlhs55z2',
                removeWatermark: true,
                model: 'video-effects',
                isPrivate: true
            };
        } else {
            body = {
                model: 'image-effects',
                toolType: 'image-effects',
                effectId: 'mugshot',
                imageUrl: imageUrl,
                userId: 'DObRu1vyStbUynoQmTcHBlhs55z2',
                removeWatermark: true,
                isPrivate: true
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit job: ' + response.statusText);
        }
        
        const data = await response.json();
        console.log('Job submitted:', data.jobId, 'Status:', data.status);
        return data;
    }

    // Poll job status until completed or failed
    const USER_ID = 'DObRu1vyStbUynoQmTcHBlhs55z2';
    const POLL_INTERVAL = 2000; // 2 seconds
    const MAX_POLLS = 60; // Max 2 minutes of polling

    async function pollJobStatus(jobId) {
        const isVideo = 'image-effects' === 'video-effects';
        const baseUrl = isVideo ? 'https://api.chromastudio.ai/video-gen' : 'https://api.chromastudio.ai/image-gen';
        let polls = 0;
        
        while (polls < MAX_POLLS) {
            const response = await fetch(
                `${baseUrl}/${USER_ID}/${jobId}/status`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to check status: ' + response.statusText);
            }
            
            const data = await response.json();
            console.log('Poll', polls + 1, '- Status:', data.status);
            
            if (data.status === 'completed') {
                console.log('Job completed!');
                return data;
            }
            
            if (data.status === 'failed' || data.status === 'error') {
                throw new Error(data.error || 'Job processing failed');
            }
            
            // Update UI with progress
            updateStatus('PROCESSING... (' + (polls + 1) + ')');
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            polls++;
        }
        
        throw new Error('Job timed out after ' + MAX_POLLS + ' polls');
    }

    // --- UI HELPER FUNCTIONS ---

    function showResultMedia(url) {
        const resultImg = document.getElementById('result-final');
        const container = resultImg ? resultImg.parentElement : document.querySelector('.result-area');
        
        if (!container) return;
        
        const isVideo = url.toLowerCase().match(/\.(mp4|webm)(\?.*)?$/i);
        
        if (isVideo) {
            // Hide image
            if (resultImg) resultImg.style.display = 'none';
            
            // Show/Create video
            let video = document.getElementById('result-video');
            if (!video) {
                video = document.createElement('video');
                video.id = 'result-video';
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.className = resultImg ? resultImg.className : 'w-full h-auto rounded-lg';
                video.style.maxWidth = '100%';
                container.appendChild(video);
            }
            video.src = url;
            video.style.display = 'block';
        } else {
            // Hide video
            const video = document.getElementById('result-video');
            if (video) video.style.display = 'none';
            
            // Show image
            if (resultImg) {
                resultImg.style.display = 'block';
                resultImg.classList.remove('hidden');
                resultImg.crossOrigin = 'anonymous';
                // Add cache buster to prevent cached non-CORS response
                resultImg.src = url + '?t=' + new Date().getTime();
            }
        }
    }

    function showDownloadButton(url) {
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.dataset.url = url;
            downloadBtn.style.display = 'inline-block';
            downloadBtn.classList.remove('hidden', 'disabled');
            downloadBtn.removeAttribute('disabled');
        }
    }

    function showLoading() {
        const loader = document.getElementById('loading-state');
        const resultContainer = document.getElementById('result-container') || document.querySelector('.result-display');
        const resultImg = document.getElementById('result-final');
        const placeholderText = document.querySelector('.placeholder-text');
        
        if (loader) {
            loader.style.display = 'flex';
            loader.classList.remove('hidden');
        }
        if (resultContainer) resultContainer.classList.add('loading');
        if (resultImg) resultImg.classList.add('hidden');
        if (placeholderText) placeholderText.classList.add('hidden');
    }

    function hideLoading() {
        const loader = document.getElementById('loading-state');
        const resultContainer = document.getElementById('result-container') || document.querySelector('.result-display');
        
        if (loader) {
            loader.style.display = 'none';
            loader.classList.add('hidden');
        }
        if (resultContainer) resultContainer.classList.remove('loading');
    }

    function updateStatus(text) {
        let statusText = document.getElementById('status-text') || document.querySelector('.status-text');
        
        // Dynamically create the status text element if it is missing
        if (!statusText) {
            const loader = document.getElementById('loading-state');
            if (loader) {
                statusText = document.createElement('p');
                statusText.id = 'status-text';
                statusText.className = 'status-text mt-4 text-center text-white font-medium text-lg';
                loader.appendChild(statusText);
            }
        }

        if (statusText) statusText.textContent = text;
        
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn) {
            if (text.includes('PROCESSING') || text.includes('UPLOADING') || text.includes('SUBMITTING') || text.includes('QUEUED')) {
                generateBtn.disabled = true;
                generateBtn.textContent = text;
            } else if (text === 'READY') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Apply Effect';
            } else if (text === 'COMPLETE') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Regenerate';
            }
        }
    }

    function showError(msg) {
        alert('Error: ' + msg); 
        console.error(msg);
    }

    function showPreview(url) {
        const img = document.getElementById('preview-image');
        const uploadContent = document.querySelector('.upload-content');
        const resetBtn = document.getElementById('reset-btn');
        
        if (img) {
            img.src = url;
            img.style.display = 'block';
            img.classList.remove('hidden');
        }
        if (uploadContent) uploadContent.classList.add('hidden');
        if (resetBtn) resetBtn.classList.remove('hidden');
    }

    function enableGenerateButton() {
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn) {
            generateBtn.disabled = false;
        }
    }

    // --- MAIN HANDLERS ---

    // Handler when file is selected - uploads immediately
    async function handleFileSelect(file) {
        try {
            showLoading();
            updateStatus('UPLOADING...');
            
            // Upload immediately when file is selected
            const uploadedUrl = await uploadFile(file);
            currentUploadedUrl = uploadedUrl;
            
            // Show the uploaded image preview
            showPreview(uploadedUrl);
            
            updateStatus('READY');
            hideLoading();
            
            // Enable the generate button
            enableGenerateButton();
            
        } catch (error) {
            hideLoading();
            updateStatus('ERROR');
            showError(error.message);
        }
    }

    // Handler when Generate button is clicked - submits job and polls for result
    async function handleGenerate() {
        if (!currentUploadedUrl) return;
        
        try {
            showLoading();
            updateStatus('SUBMITTING JOB...');
            
            // Step 1: Submit job to ChromaStudio API
            const jobData = await submitImageGenJob(currentUploadedUrl);
            console.log('Job ID:', jobData.jobId);
            
            updateStatus('JOB QUEUED...');
            
            // Step 2: Poll for completion
            const result = await pollJobStatus(jobData.jobId);
            
            const resultItem = Array.isArray(result.result) ? result.result[0] : result.result;
            const resultUrl = resultItem?.mediaUrl || resultItem?.video || resultItem?.image;
            
            if (!resultUrl) {
                console.error('Response:', result);
                throw new Error('No image URL in response');
            }
            
            console.log('Result image URL:', resultUrl);
            
            // Update stored URL for download
            currentUploadedUrl = resultUrl; // Note: We update this so next action downloads result, not original
            
            // Step 4: Display result
            showResultMedia(resultUrl);
            
            updateStatus('COMPLETE');
            hideLoading();
            showDownloadButton(resultUrl);
            
        } catch (error) {
            hideLoading();
            updateStatus('ERROR');
            showError(error.message);
        }
    }

    // --- EVENT LISTENERS ---

    // File Input & Drag Drop Wiring
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileSelect(file);
        });
    }

    if (uploadZone) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        uploadZone.addEventListener('dragover', () => {
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
        });
        
        // Click to upload
        uploadZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    // GENERATE BUTTON
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // DOWNLOAD BUTTON
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent default anchor behavior
            
            const url = downloadBtn.dataset.url;
            if (!url) return;
            
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.disabled = true;
            
            try {
                // Fetch the file as a blob - this FORCES download instead of opening
                const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
                const response = await fetch(fetchUrl, {
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch file: ' + response.statusText);
                }
                
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                
                // Determine file extension
                const contentType = response.headers.get('content-type') || '';
                let extension = 'jpg';
                if (contentType.includes('video') || url.match(/\.(mp4|webm)/i)) {
                    extension = 'mp4';
                } else if (contentType.includes('png') || url.match(/\.png/i)) {
                    extension = 'png';
                } else if (contentType.includes('webp') || url.match(/\.webp/i)) {
                    extension = 'webp';
                }
                
                // Create download link
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = 'mugshot_' + generateNanoId(8) + '.' + extension;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Cleanup
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                
            } catch (err) {
                console.error('Download error:', err);
                
                // Fallback: Canvas for images
                try {
                    const img = document.getElementById('result-final');
                    if (img && img.style.display !== 'none' && img.complete && img.naturalWidth > 0) {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = 'mugshot_' + generateNanoId(8) + '.png';
                                link.click();
                                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
                            } else {
                                throw new Error('Canvas blob failed');
                            }
                        }, 'image/png');
                        return;
                    }
                } catch (canvasErr) {
                    console.error('Canvas fallback error:', canvasErr);
                }
                
                // Final fallback
                alert('Direct download failed. Opening in new tab...');
                window.open(url, '_blank');
            } finally {
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
            }
        });
    }

    // RESET BUTTON
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentUploadedUrl = null;
            
            // Reset Preview
            const previewImage = document.getElementById('preview-image');
            if (previewImage) {
                previewImage.src = '';
                previewImage.classList.add('hidden');
                previewImage.style.display = 'none';
            }
            
            // Show Upload Content
            const uploadContent = document.querySelector('.upload-content');
            if (uploadContent) uploadContent.classList.remove('hidden');
            
            // Reset File Input
            if (fileInput) fileInput.value = '';
            
            // Reset Result Area
            const resultImg = document.getElementById('result-final');
            if (resultImg) {
                resultImg.classList.add('hidden');
                resultImg.src = '';
                resultImg.style.display = 'none';
            }
            const video = document.getElementById('result-video');
            if (video) video.style.display = 'none';
            
            const placeholderText = document.querySelector('.placeholder-text');
            if (placeholderText) {
                placeholderText.classList.remove('hidden');
                placeholderText.style.display = 'block';
            }
            
            // Reset Buttons
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = 'Apply Effect';
            }
            if (resetBtn) resetBtn.classList.add('hidden');
            if (downloadBtn) {
                downloadBtn.classList.add('hidden', 'disabled');
                downloadBtn.style.display = 'none';
            }
            
            hideLoading();
            updateStatus('');
        });
    }

    // Mouse Tracking for subtle glow effects (Legacy)
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth * 100;
        const y = e.clientY / window.innerHeight * 100;
        
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    });
});