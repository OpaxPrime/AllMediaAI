document.addEventListener('DOMContentLoaded', function() {
    // ======================
    // DOM Elements
    // ======================
    const elements = {
        originalTitle: document.getElementById('original-title'),
        platformButtons: document.querySelectorAll('.platform-btn'),
        generateBtn: document.getElementById('generate-btn'),
        resultTitle: document.getElementById('result-title'),
        seoExplanation: document.getElementById('seo-explanation'),
        copyBtn: document.getElementById('copy-btn'),
        loadingIndicator: document.createElement('div'),
        socialIcons: document.querySelectorAll('.social-icon')
    };

    // ======================
    // State Management
    // ======================
    const state = {
        selectedPlatform: '',
        isGenerating: false,
        lastRequestTime: 0
    };

    // ======================
    // Initialization
    // ======================
    function init() {
        setupEventListeners();
        setupSocialShare();
    }

    function setupEventListeners() {
        // Platform selection
        elements.platformButtons.forEach(button => {
            button.addEventListener('click', handlePlatformSelection);
        });

        // Generate button
        elements.generateBtn.addEventListener('click', throttle(handleGenerateClick, 2000));

        // Copy button
        elements.copyBtn.addEventListener('click', handleCopyClick);

        // Input field enter key
        elements.originalTitle.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleGenerateClick();
        });
    }

    function setupSocialShare() {
        elements.socialIcons.forEach(icon => {
            icon.addEventListener('click', function(e) {
                e.preventDefault();
                const platform = this.querySelector('i').className.split('-')[1];
                shareOnSocial(platform);
            });
        });
    }

    // ======================
    // Event Handlers
    // ======================
    function handlePlatformSelection(event) {
        elements.platformButtons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        state.selectedPlatform = event.currentTarget.getAttribute('data-platform');
    }

    function handleGenerateClick() {
        if (state.isGenerating) return;

        const originalTitle = elements.originalTitle.value.trim();
        if (!validateInputs(originalTitle)) return;

        try {
            setLoadingState(true);

            // Generate optimized title using algorithmic approach
            const optimizedTitle = generateOptimizedTitle(originalTitle);
            elements.resultTitle.textContent = optimizedTitle;

            // Generate SEO analysis
            const analysis = generateSEOAnalysis(originalTitle, optimizedTitle);
            elements.seoExplanation.innerHTML = formatAnalysis(analysis);
            setupExpandableSections();

        } catch (error) {
            handleGenerationError(error);
        } finally {
            setLoadingState(false);
        }
    }

    function handleCopyClick() {
        const textToCopy = elements.resultTitle.textContent;
        if (!textToCopy || textToCopy === 'Your optimized title will appear here') return;

        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showTooltip(elements.copyBtn, 'Copied!');
            })
            .catch(err => {
                console.error('Copy failed:', err);
                showTooltip(elements.copyBtn, 'Failed to copy');
            });
    }

    // ======================
    // Core Business Logic
    // ======================
    function generateOptimizedTitle(title) {
        // Clean and process the original title
        let optimizedTitle = title.trim();
        
        // Apply platform-specific optimizations
        switch(state.selectedPlatform) {
            case 'x':
                optimizedTitle = optimizeForX(optimizedTitle);
                break;
            case 'youtube':
                optimizedTitle = optimizeForYouTube(optimizedTitle);
                break;
            case 'instagram':
                optimizedTitle = optimizeForInstagram(optimizedTitle);
                break;
            case 'facebook':
                optimizedTitle = optimizeForFacebook(optimizedTitle);
                break;
        }
        
        // Apply general SEO optimizations
        optimizedTitle = applyGeneralSEOOptimizations(optimizedTitle);
        
        // Truncate to platform character limit
        const charLimit = getPlatformCharLimit();
        if (optimizedTitle.length > charLimit) {
            optimizedTitle = optimizedTitle.substring(0, charLimit - 3) + '...';
        }
        
        return optimizedTitle;
    }

    function generateSEOAnalysis(originalTitle, optimizedTitle) {
        // Calculate various SEO metrics
        const readabilityScore = calculateReadability(optimizedTitle);
        const keywordDensity = calculateKeywordDensity(originalTitle, optimizedTitle);
        const emotionalTriggers = countEmotionalTriggers(optimizedTitle);
        const powerWords = countPowerWords(optimizedTitle);
        const charCount = optimizedTitle.length;
        const charLimit = getPlatformCharLimit();
        
        // Generate SEO analysis based on metrics
        let analysis = '';
        analysis += '<h4>Keyword Strategy</h4>';
        analysis += `<p>Keyword density: ${keywordDensity.toFixed(2)}%</p>`;
        
        analysis += '<h4>Engagement Factors</h4>';
        analysis += `<p>Emotional triggers: ${emotionalTriggers}</p>`;
        analysis += `<p>Power words: ${powerWords}</p>`;
        
        analysis += '<h4>Technical Metrics</h4>';
        analysis += `<p>Readability score: ${readabilityScore}/100</p>`;
        analysis += `<p>Character count: ${charCount}/${charLimit}</p>`;
        
        analysis += '<h4>Optimization Tips</h4>';
        analysis += '<ul>';
        if (charCount > charLimit * 0.9) {
            analysis += '<li>Approaching character limit - consider shortening</li>';
        }
        if (emotionalTriggers === 0) {
            analysis += '<li>Add emotional triggers to increase engagement</li>';
        }
        if (powerWords === 0) {
            analysis += '<li>Include power words to grab attention</li>';
        }
        if (readabilityScore < 60) {
            analysis += '<li>Consider simplifying language for better readability</li>';
        }
        analysis += '</ul>';
        
        return analysis;
    }

    // ======================
    // Platform-Specific Optimization Functions
    // ======================
    function optimizeForX(title) {
        // Add relevant hashtags (1-2) and power words
        let optimized = addHashtags(title, 1);
        optimized = addPowerWords(optimized, 1);
        return optimized;
    }

    function optimizeForYouTube(title) {
        // Add numbers and brackets for metadata
        let optimized = addNumbersToTitle(title);
        optimized = addBracketsForYear(optimized);
        optimized = frontLoadKeywords(optimized);
        return optimized;
    }

    function optimizeForInstagram(title) {
        // Add emojis and make it engaging
        let optimized = addEmojis(title);
        optimized = addHashtags(optimized, 3); // Add hashtags to the title itself
        return optimized;
    }

    function optimizeForFacebook(title) {
        // Add question format and emotional triggers
        let optimized = convertToQuestion(title);
        optimized = addEmotionalTriggers(optimized);
        return optimized;
    }

    function applyGeneralSEOOptimizations(title) {
        // Capitalize first letter of each word (title case)
        title = toTitleCase(title);
        
        // Add power words
        title = addPowerWords(title, 1);
        
        // Add emotional triggers
        title = addEmotionalTriggers(title);
        
        return title;
    }

    // ======================
    // Helper Functions for SEO Optimizations
    // ======================
    function addHashtags(title, count) {
        // Simple hashtag addition based on key words in the title
        const words = title.split(/\s+/);
        const hashtags = [];
        
        for (let i = 0; i < Math.min(count, words.length); i++) {
            // Take significant words (length > 3) and convert to hashtag
            if (words[i].length > 3) {
                hashtags.push('#' + words[i]);
            }
        }
        
        return title + ' ' + hashtags.join(' ');
    }

    function addPowerWords(title, count) {
        const powerWords = ['New', 'Free', 'Best', 'Top', 'Ultimate', 'Complete', 'Exclusive', 'Proven', 'Instant', 'Amazing'];
        let result = title;
        
        for (let i = 0; i < count; i++) {
            if (!hasPowerWord(result)) {
                result = powerWords[Math.floor(Math.random() * powerWords.length)] + ' ' + result;
            }
        }
        
        return result;
    }

    function addEmotionalTriggers(title) {
        const emotionalTriggers = ['Surprising', 'Shocking', 'Incredible', 'Mind-blowing', 'Unbelievable'];
        if (!hasEmotionalTrigger(title)) {
            return emotionalTriggers[Math.floor(Math.random() * emotionalTriggers.length)] + ' ' + title;
        }
        return title;
    }

    function addNumbersToTitle(title) {
        // Add numbers if not present
        if (!/\d/.test(title)) {
            const numbers = ['5', '7', '10', '3'];
            return numbers[Math.floor(Math.random() * numbers.length)] + ' ' + title;
        }
        return title;
    }

    function addBracketsForYear(title) {
        const year = new Date().getFullYear();
        if (!title.includes(year.toString())) {
            return title + ` [${year}]`;
        }
        return title;
    }

    function frontLoadKeywords(title) {
        // For simplicity, we'll just capitalize the first few words to emphasize them
        const words = title.split(/\s+/);
        if (words.length >= 2) {
            words[0] = words[0].toUpperCase();
            words[1] = words[1].toUpperCase();
        }
        return words.join(' ');
    }

    function addEmojis(title) {
        const emojis = ['🔥', '⭐', '💡', '🚀', '🎯', '✨', '🌟', '💯'];
        return emojis[Math.floor(Math.random() * emojis.length)] + ' ' + title;
    }

    function convertToQuestion(title) {
        // Convert statement to question if not already a question
        if (!title.endsWith('?')) {
            return title + '?';
        }
        return title;
    }

    function toTitleCase(str) {
        return str.toLowerCase().split(' ').map(function(word) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }

    function hasPowerWord(title) {
        const powerWords = ['New', 'Free', 'Best', 'Top', 'Ultimate', 'Complete', 'Exclusive', 'Proven', 'Instant', 'Amazing'];
        return powerWords.some(word => title.includes(word));
    }

    function hasEmotionalTrigger(title) {
        const emotionalTriggers = ['Surprising', 'Shocking', 'Incredible', 'Mind-blowing', 'Unbelievable'];
        return emotionalTriggers.some(trigger => title.includes(trigger));
    }

    function getPlatformCharLimit() {
        const limits = {
            'x': 280,
            'youtube': 100,
            'instagram': 2200,
            'facebook': 80
        };
        return limits[state.selectedPlatform];
    }

    // ======================
    // Analysis Utilities
    // ======================
    function countEmotionalTriggers(title) {
        const triggers = [
            'surprising', 'shocking', 'incredible', 'amazing', 'unbelievable',
            'mind-blowing', 'extraordinary', 'astounding', 'phenomenal'
        ];
        return triggers.filter(t => title.toLowerCase().includes(t)).length;
    }

    function countPowerWords(title) {
        const powerWords = [
            'proven', 'ultimate', 'secret', 'shocking',
            'breakthrough', 'instant', 'guaranteed', 'exclusive',
            'master', 'essential', 'complete', 'definitive',
            'new', 'free', 'best', 'top', 'amazing'
        ];
        return powerWords.filter(pw => title.toLowerCase().includes(pw)).length;
    }

    function calculateReadability(title) {
        // Flesch-Kincaid approximation
        const words = title.split(/\s+/);
        if (words.length === 0) return 0;
        
        const syllables = words.reduce((acc, word) => {
            return acc + countSyllables(word);
        }, 0);
        
        // Simplified Flesch Reading Ease formula
        const avgWordsPerSentence = words.length; // Since we have one "sentence"
        const avgSyllablesPerWord = syllables / words.length;
        
        const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    function countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        const matches = word.match(/[aeiouy]{1,2}/g);
        return matches ? matches.length : 1;
    }

    function calculateKeywordDensity(original, optimized) {
        // Simple keyword density calculation
        const originalWords = original.toLowerCase().split(/\s+/);
        const optimizedWords = optimized.toLowerCase().split(/\s+/);
        
        let matchCount = 0;
        originalWords.forEach(word => {
            if (optimizedWords.includes(word) && word.length > 2) {
                matchCount++;
            }
        });
        
        return (matchCount / originalWords.length) * 100;
    }

    function formatAnalysis(analysis) {
        return analysis
            .replace(/<h4>(.+?)<\/h4>/g, '</div><div class="analysis-section"><div class="section-header">$1<span class="expand-icon">+</span></div><div class="section-content">')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(\d+\/100|\d+%)</g, '<span class="metric-value">$1</span>')
            .replace(/(Analysis:|Impact:|Score:)/g, '<br><em class="analysis-label">$1</em>');
    }

    function setupExpandableSections() {
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', function() {
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
            });
        });
    }

    // ======================
    // Social Sharing
    // ======================
    function shareOnSocial(platform) {
        const title = encodeURIComponent(elements.resultTitle.textContent);
        let url = '';

        switch(platform) {
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${title}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?quote=${title}`;
                break;
            case 'instagram':
                // Instagram doesn't support direct sharing via URL
                showTooltip(elements.socialIcons[2], 'Copy title to share on Instagram');
                return;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=&title=${title}`;
                break;
        }

        if (url) {
            window.open(url, '_blank', 'width=600,height=400');
        }
    }

    // ======================
    // UI Utilities
    // ======================
    function validateInputs(title) {
        if (!title) {
            showTooltip(elements.originalTitle, 'Please enter a title');
            return false;
        }
        if (!state.selectedPlatform) {
            showTooltip(elements.platformButtons[0], 'Please select a platform');
            return false;
        }
        return true;
    }

    function setLoadingState(isLoading) {
        state.isGenerating = isLoading;
        elements.generateBtn.disabled = isLoading;
        elements.loadingIndicator.style.display = isLoading ? 'flex' : 'none';

        if (isLoading) {
            elements.resultTitle.textContent = 'Crafting your perfect title...';
            elements.seoExplanation.textContent = 'Preparing in-depth analysis...';
        }
    }

    function handleGenerationError(error) {
        console.error('Generation error:', error);
        elements.resultTitle.textContent = 'Error generating title';
        elements.seoExplanation.innerHTML = `
            <div class="error-message">
                <h4>Analysis Failed</h4>
                <p>${error.message || 'API service unavailable'}</p>
                <p>Please try again later or check your connection.</p>
            </div>
        `;
    }

    function showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width/2}px`;
        tooltip.style.top = `${rect.top - 40}px`;

        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
    }

    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    // Initialize the application
    init();
});