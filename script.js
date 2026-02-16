document.addEventListener('DOMContentLoaded', function() {
    // ======================
    // API Configuration
    // ======================
    const API_CONFIG = {
        deepseek: {
            key: 'YOUR_DEEPSEEK_API_KEY_HERE', // Replace with your actual API key
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
            model: 'deepseek/deepseek-r1-0528:free',
            timeout: 30000 // 30 seconds
        },
        maxRetries: 3,
        retryDelay: 1000 // 1 second initial delay
    };

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
        socialIcons: document.querySelectorAll('.social-icon'),
    };

    // ======================
    // State Management
    // ======================
    const state = {
        selectedPlatform: '',
        isGenerating: false,
        lastRequestTime: 0,
        conversationHistory: []
    };

    // ======================
    // API Communication
    // ======================
    async function callDeepSeekAPI(messages, maxTokens = 1024) {
        if (!API_CONFIG.deepseek.key) {
            throw new Error('DeepSeek API key is not set. Please configure your API key.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.deepseek.timeout);

        try {
            const response = await fetch(API_CONFIG.deepseek.endpoint, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_CONFIG.deepseek.key}`
                },
                body: JSON.stringify({
                    model: API_CONFIG.deepseek.model,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: 0.7
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
            }

            const data = await response.json();
            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Invalid API response structure');
            }

            return data.choices[0].message.content;
        } catch (error) {
            clearTimeout(timeoutId);
            throw new Error(`DeepSeek API error: ${error.message}`);
        }
    }

    async function retryApiCall(apiFunction, retries) {
        for (let i = 0; i < retries; i++) {
            try {
                return await apiFunction();
            } catch (error) {
                if (i === retries - 1) throw error; // Last attempt
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay * (i + 1)));
            }
        }
    }

    // ======================
    // API Key Management
    // ======================
    // API key is now hardcoded in the configuration above
    // Make sure to replace 'YOUR_DEEPSEEK_API_KEY_HERE' with your actual API key

    // ======================
    // System Prompt Management
    // ======================
    // NOTE: To modify the system prompt, edit the DEFAULT_SYSTEM_PROMPT constant below
    const DEFAULT_SYSTEM_PROMPT = `You are an expert SEO specialist and content creator assistant. Your job is to help content creators optimize their titles for various social media platforms. When given an original title and a target platform, you should:

1. Analyze the original title for keywords and intent
2. Optimize the title for the specific platform's algorithm and audience
3. Enhance engagement potential while maintaining the original meaning
4. Follow platform-specific best practices for titles
5. Provide a detailed SEO analysis explaining your optimizations

Always return both the optimized title and a comprehensive SEO analysis.`;

    function setSystemPrompt(prompt) {
        // Update the system prompt for the conversation
        if (state.conversationHistory.length > 0 && state.conversationHistory[0].role === 'system') {
            state.conversationHistory[0].content = prompt;
        } else {
            state.conversationHistory.unshift({
                role: 'system',
                content: prompt
            });
        }
    }

    // Load system prompt from localStorage if available, otherwise use default
    const savedSystemPrompt = localStorage.getItem('system_prompt');
    if (savedSystemPrompt) {
        setSystemPrompt(savedSystemPrompt);
    } else {
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    }

    // ======================
    // Initialization
    // ======================
    function init() {
        setupEventListeners();
        setupSocialShare();
        setupDarkMode();
    }

    // ======================
    // Dark Mode Functionality
    // ======================
    function setupDarkMode() {
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const currentTheme = localStorage.getItem('theme');
        
        // Apply saved theme on page load
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateDarkModeIcon(true);
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            updateDarkModeIcon(false);
        }
        
        // Add event listener to toggle button
        darkModeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            
            if (currentTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                updateDarkModeIcon(false);
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                updateDarkModeIcon(true);
            }
        });
    }

    function updateDarkModeIcon(isDark) {
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const icon = darkModeToggle.querySelector('i');
        
        // Remove existing icon classes
        icon.classList.remove('fa-moon', 'fa-sun');
        
        // Add appropriate icon based on theme
        if (isDark) {
            icon.classList.add('fa-sun');
            darkModeToggle.title = 'Switch to Light Mode';
        } else {
            icon.classList.add('fa-moon');
            darkModeToggle.title = 'Switch to Dark Mode';
        }
    }

    function setupEventListeners() {
        // System prompt modal functionality
        const systemPromptIcon = document.getElementById('system-prompt-icon');
        const systemPromptModal = document.getElementById('system-prompt-modal');
        const systemPromptInput = document.getElementById('system-prompt');
        const saveSystemPromptButton = document.getElementById('save-system-prompt');
        const closeModalButton = document.getElementById('close-modal');
        
        // Show modal when clicking the icon
        if (systemPromptIcon) {
            systemPromptIcon.addEventListener('click', function() {
                systemPromptModal.classList.add('active');
                // Load saved system prompt into the textarea
                const savedPrompt = localStorage.getItem('system_prompt');
                if (savedPrompt) {
                    systemPromptInput.value = savedPrompt;
                }
            });
        }
        
        // Hide modal when clicking the close button
        if (closeModalButton) {
            closeModalButton.addEventListener('click', function() {
                // Add fade-out animation before hiding
                systemPromptModal.classList.add('hiding');
                setTimeout(() => {
                    systemPromptModal.classList.remove('active');
                    systemPromptModal.classList.remove('hiding');
                }, 300);
            });
        }

        // Hide modal when clicking outside the modal content
        if (systemPromptModal) {
            systemPromptModal.addEventListener('click', function(event) {
                if (event.target === systemPromptModal) {
                    // Add fade-out animation before hiding
                    systemPromptModal.classList.add('hiding');
                    setTimeout(() => {
                        systemPromptModal.classList.remove('active');
                        systemPromptModal.classList.remove('hiding');
                    }, 300);
                }
            });
        }
        
        // Save system prompt
        if (systemPromptInput && saveSystemPromptButton) {
            // Load saved system prompt into the textarea
            const savedPrompt = localStorage.getItem('system_prompt');
            if (savedPrompt) {
                systemPromptInput.value = savedPrompt;
            }

            saveSystemPromptButton.addEventListener('click', function() {
                const systemPrompt = systemPromptInput.value.trim();
                if (systemPrompt) {
                    setSystemPrompt(systemPrompt);
                    localStorage.setItem('system_prompt', systemPrompt); // Save to localStorage
                    showTooltip(saveSystemPromptButton, 'System Prompt Saved!');
                    // Close the modal after saving
                    systemPromptModal.classList.remove('active');
                } else {
                    showTooltip(systemPromptInput, 'Please enter a system prompt');
                }
            });
        }


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
        elements.platformButtons.forEach(btn => {
            if (btn.classList.contains('active')) {
                // Add fade-out effect to previous active button
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    btn.classList.remove('active');
                    btn.style.transform = '';
                }, 150);
            }
        });
        
        // Add fade-in effect to newly selected button
        event.currentTarget.classList.add('active');
        event.currentTarget.style.transform = 'scale(1.05)';
        setTimeout(() => {
            event.currentTarget.style.transform = '';
        }, 200);
        
        state.selectedPlatform = event.currentTarget.getAttribute('data-platform');
    }

    async function handleGenerateClick() {
        if (state.isGenerating) return;

        const originalTitle = elements.originalTitle.value.trim();
        if (!validateInputs(originalTitle)) return;

        try {
            setLoadingState(true);

            // Generate optimized title using API
            const optimizedTitle = await retryApiCall(
                () => generateOptimizedTitle(originalTitle),
                API_CONFIG.maxRetries
            );
            
            // Animate the result title
            elements.resultTitle.style.opacity = '0';
            setTimeout(() => {
                elements.resultTitle.textContent = optimizedTitle;
                elements.resultTitle.style.transition = 'opacity 0.5s ease-in-out';
                elements.resultTitle.style.opacity = '1';
            }, 100);

            // Generate SEO analysis
            const analysis = await retryApiCall(
                () => generateSEOAnalysis(originalTitle, optimizedTitle),
                API_CONFIG.maxRetries
            );
            
            // Animate the SEO explanation
            elements.seoExplanation.style.opacity = '0';
            setTimeout(() => {
                elements.seoExplanation.innerHTML = analysis;
                setupExpandableSections();
                elements.seoExplanation.style.transition = 'opacity 0.5s ease-in-out';
                elements.seoExplanation.style.opacity = '1';
            }, 100);

            // Set a default engagement score since we're using AI
            document.getElementById('engagement-score').textContent = 'N/A';

        } catch (error) {
            handleGenerationError(error);
        } finally {
            setLoadingState(false);
        }
    }

    function handleCopyClick() {
        const textToCopy = elements.resultTitle.textContent;
        if (!textToCopy || textToCopy === 'Your optimized title will appear here') return;

        // Add animation to the copy button
        elements.copyBtn.style.transform = 'scale(0.95)';
        elements.copyBtn.style.backgroundColor = '#17bf63';
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                // Success animation
                elements.copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                
                setTimeout(() => {
                    elements.copyBtn.innerHTML = 'Copy to Clipboard';
                    elements.copyBtn.style.transform = '';
                    elements.copyBtn.style.backgroundColor = '';
                }, 2000);
            })
            .catch(err => {
                console.error('Copy failed:', err);
                showTooltip(elements.copyBtn, 'Failed to copy');
                elements.copyBtn.style.transform = '';
                elements.copyBtn.style.backgroundColor = '';
            });
    }

    // ======================
    // Core Business Logic - API-Based
    // ======================
    async function generateOptimizedTitle(title) {
        const prompt = `
        As a Senior SEO Engineer with 15+ years of experience, optimize this title for ${state.selectedPlatform}:

        Original Title: "${title}"
        Platform: ${state.selectedPlatform}
        Character Limit: ${getPlatformCharLimit()}
        Target Audience: Social media marketers and content creators

        Requirements:
        1. Keyword Optimization:
        - Extract and preserve core keywords
        - Front-load primary keyword
        - Include relevant LSI keywords

        2. Platform-Specific Optimization:
        ${getPlatformSpecificGuidelines()}

        3. Engagement Enhancement:
        - Add appropriate hashtags if relevant to platform
        - Include power words and emotional triggers where suitable
        - Create curiosity gap without clickbait

        4. Technical Requirements:
        - Stay within ${getPlatformCharLimit()} character limit
        - Make it mobile-friendly
        - Ensure clarity and readability

        Respond with only the optimized title, nothing else.
        `;

        const messages = [
            { role: 'system', content: state.conversationHistory[0]?.content || `You are an expert SEO specialist and content creator assistant.` },
            { role: 'user', content: prompt }
        ];

        const response = await retryApiCall(() => callDeepSeekAPI(messages, 200), API_CONFIG.maxRetries);
        return response.trim();
    }

    async function generateSEOAnalysis(originalTitle, optimizedTitle) {
        const prompt = `
        Conduct a comprehensive SEO audit of this title optimization for ${state.selectedPlatform}:

        Original Title: "${originalTitle}"
        Optimized Title: "${optimizedTitle}"
        Platform: ${state.selectedPlatform}

        Provide an in-depth analysis with these sections:

        ## 1. Keyword Strategy Analysis
        - Keyword mapping between original and optimized
        - Keyword placement effectiveness
        - Semantic relevance assessment

        ## 2. Platform Algorithm Optimization
        - ${getPlatformAlgorithmFactors()}
        - Character length effectiveness (${optimizedTitle.length}/${getPlatformCharLimit()})
        - Engagement signal analysis
        - Best practice compliance

        ## 3. Psychological Effectiveness
        - Attention capture mechanisms
        - Emotional resonance evaluation
        - Curiosity gap effectiveness
        - Action-inducing elements

        ## 4. Technical SEO Validation
        - Readability assessment
        - Keyword prominence analysis
        - Mobile rendering considerations
        - Accessibility factors

        ## 5. Content Creator Recommendations
        - Specific suggestions for improvement
        - Alternative approaches to consider
        - Future optimization opportunities
        - Performance prediction

        Format with markdown headers (##) and bullet points.
        Include specific metrics and actionable recommendations.
        Use professional SEO terminology.
        `;

        const messages = [
            { role: 'system', content: state.conversationHistory[0]?.content || `You are an expert SEO specialist and content creator assistant.` },
            { role: 'user', content: prompt }
        ];

        const response = await retryApiCall(() => callDeepSeekAPI(messages, 1000), API_CONFIG.maxRetries);
        return formatAnalysis(response);
    }

    // ======================
    // Platform-Specific Guidelines Functions
    // ======================
    function getPlatformSpecificGuidelines() {
        const guidelines = {
            'x': `- Ideal length: 81-100 characters for visibility
- Include 1-2 highly relevant hashtags
- Use question structures when appropriate
- Focus on trending topics and timely content
- Encourage replies and retweets`,
            'youtube': `- Target length: 41-60 characters for search
- Include numbers (3, 5, 7, 10) for listicles
- Use brackets for metadata [2024]
- Front-load primary keyword for algorithm
- Create curiosity with cliffhangers`,
            'instagram': `- Optimal caption length: 5-7 words for feed preview
- Include 3-5 targeted hashtags in first comment
- Use 1-2 relevant emojis for visual appeal
- Add "Save"-triggering phrases
- Encourage tagging and sharing`,
            'facebook': `- Ideal preview text: 40-60 characters
- Use question formats to encourage comments
- Include "Tag friends" triggers
- Maintain positive sentiment (>70%)
- Encourage meaningful discussions`
        };
        return guidelines[state.selectedPlatform] || guidelines['x']; // Default to X guidelines
    }

    function getPlatformAlgorithmFactors() {
        const factors = {
            'x': `Twitter's algorithm prioritizes:
- Engagement velocity (likes, retweets, replies in first 30 minutes)
- Hashtag relevance and popularity
- Account authority and follower count
- Media attachments (images/videos)`,
            'youtube': `YouTube's algorithm favors:
- Click-through rate (CTR)
- Watch time and retention
- Session duration
- User engagement (likes, comments, shares)
- Video quality and metadata`,
            'instagram': `Instagram's algorithm weights:
- Saves and shares
- Comment quality and length
- Explore page engagement
- Reels completion rate
- Account relevance and history`,
            'facebook': `Facebook's algorithm prefers:
- Meaningful interactions (long comments)
- Shareability (private messages count)
- Video completion rates
- Post freshness and timeliness
- Page authority and trust`
        };
        return factors[state.selectedPlatform] || factors['x']; // Default to X factors
    }

    function applyGeneralSEOOptimizations(title) {
        // Extract and prioritize keywords
        title = prioritizeKeywords(title);

        // Capitalize first letter of each word (title case)
        title = toTitleCase(title);

        // Add power words
        title = addPowerWords(title, 1);

        // Add emotional triggers
        title = addEmotionalTriggers(title);

        return title;
    }

    function prioritizeKeywords(title) {
        // Define primary and secondary keywords based on importance
        const primaryKeywords = extractPrimaryKeywords(title);
        
        // If we have primary keywords, try to front-load them
        if (primaryKeywords.length > 0) {
            // Find the most important keyword (longest or most unique)
            const mainKeyword = primaryKeywords.sort((a, b) => b.length - a.length)[0];
            
            // If the main keyword is not already at the beginning, move it there
            if (!title.toLowerCase().startsWith(mainKeyword.toLowerCase())) {
                // Remove the keyword from its current position
                let updatedTitle = title.replace(new RegExp('\\b' + mainKeyword + '\\b', 'gi'), '');
                
                // Add it to the beginning
                updatedTitle = mainKeyword + ' ' + updatedTitle.trim();
                
                return updatedTitle.replace(/\s+/g, ' '); // Normalize spaces
            }
        }
        
        return title;
    }

    function extractPrimaryKeywords(title) {
        // Simple keyword extraction - in a real implementation, this would connect to a keyword API
        const words = title.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 3); // Only consider words longer than 3 chars
        
        // Filter out common stop words
        const stopWords = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
            'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
            'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 
            'did', 'she', 'use', 'way', 'will', 'with', 'any', 'each', 'man', 'men', 
            'own', 'take', 'than', 'too', 'upon', 'use', 'very', 'want', 'well', 
            'went', 'were', 'work', 'year', 'been', 'call', 'first', 'food', 'hand', 
            'last', 'part', 'place', 'same', 'work', 'here', 'home', 'house', 'large', 
            'show', 'small', 'spell', 'thing', 'walk', 'why', 'about', 'after', 'again', 
            'could', 'every', 'found', 'great', 'large', 'learn', 'never', 'often', 
            'other', 'said', 'some', 'sound', 'spell', 'still', 'those', 'under', 
            'water', 'where', 'which', 'would', 'write', 'right', 'many', 'think', 
            'more', 'number', 'no', 'people', 'than', 'them', 'these', 'time', 'two', 
            'up', 'use', 'very', 'way', 'week', 'well', 'went', 'were', 'what', 
            'when', 'where', 'which', 'while', 'who', 'will', 'with', 'year', 'you', 
            'your', 'a', 'an', 'of', 'to', 'in', 'is', 'on', 'that', 'by', 'this', 
            'have', 'from', 'or', 'as', 'be', 'at', 'so', 'we', 'he', 'me', 'my', 
            'us', 'him', 'her', 'they', 'she', 'it', 'do', 'go', 'if', 'mr', 'mrs', 
            'said', 'say', 'says', 'get', 'got', 'set', 'make', 'made', 'may', 'put', 
            'seem', 'seems', 'take', 'took', 'come', 'came', 'see', 'saw', 'know', 
            'knew', 'think', 'thought', 'look', 'looked', 'give', 'gave', 'use', 'used', 
            'find', 'found', 'tell', 'told', 'become', 'became', 'leave', 'left', 'feel', 
            'felt', 'bring', 'brought', 'begin', 'began', 'keep', 'kept', 'hold', 'held', 
            'write', 'wrote', 'stand', 'stood', 'hear', 'heard', 'let', 'mean', 'meant', 
            'set', 'meet', 'met', 'run', 'pay', 'paid', 'sit', 'sat', 'speak', 'spoke', 
            'lie', 'lay', 'lead', 'led', 'read', 'read', 'grow', 'grew', 'fall', 'fell', 
            'send', 'sent', 'build', 'built', 'live', 'lived', 'hurt', 'need', 'cut', 
            'burn', 'burnt', 'deal', 'dealt', 'hang', 'hung', 'shine', 'shone', 'stretch', 
            'stretched', 'speed', 'sped', 'spill', 'spilt', 'spin', 'spun', 'spread', 
            'spread', 'spring', 'sprang', 'steal', 'stole', 'stick', 'stuck', 'swear', 
            'swore', 'swing', 'swung', 'teach', 'taught', 'tear', 'tore', 'wake', 'woke', 
            'wear', 'wore', 'win', 'won', 'withdraw', 'withdrew', 'break', 'broke'
        ];
        
        return words.filter(word => !stopWords.includes(word));
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

    function addSmartHashtags(title, count) {
        // More intelligent hashtag addition based on content analysis
        const keywords = extractPrimaryKeywords(title);
        const hashtags = [];
        
        // Select the most relevant keywords for hashtags
        const selectedKeywords = keywords.slice(0, count);
        
        for (const keyword of selectedKeywords) {
            // Create hashtag from keyword
            hashtags.push('#' + keyword.replace(/\s+/g, ''));
        }
        
        return title + ' ' + hashtags.join(' ');
    }

    function addPowerWords(title, count) {
        // Extended list of power words categorized by impact
        const powerWords = {
            'descriptive': ['Ultimate', 'Complete', 'Comprehensive', 'Essential', 'Definitive', 'Advanced'],
            'benefit': ['Proven', 'Effective', 'Powerful', 'Game-changing', 'Revolutionary', 'Breakthrough'],
            'urgency': ['Exclusive', 'Limited', 'Rare', 'Secret', 'Insider', 'Premium'],
            'action': ['Instant', 'Quick', 'Easy', 'Simple', 'Effortless', 'Immediate']
        };
        
        let result = title;
        const allPowerWords = [...powerWords.descriptive, ...powerWords.benefit, ...powerWords.urgency, ...powerWords.action];

        for (let i = 0; i < count; i++) {
            if (!hasPowerWord(result)) {
                // Choose a power word from a random category
                const categories = Object.keys(powerWords);
                const randomCategory = categories[Math.floor(Math.random() * categories.length)];
                const randomWord = powerWords[randomCategory][Math.floor(Math.random() * powerWords[randomCategory].length)];
                
                result = randomWord + ' ' + result;
            }
        }

        return result;
    }

    function addEmotionalTriggers(title) {
        // Extended list of emotional triggers
        const emotionalTriggers = [
            'Surprising', 'Shocking', 'Incredible', 'Mind-blowing', 'Unbelievable', 
            'Stunning', 'Astonishing', 'Remarkable', 'Extraordinary', 'Phenomenal',
            'Life-changing', 'Eye-opening', 'Groundbreaking', 'Revolutionary', 'Groundbreaking'
        ];
        
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

    function addCuriosityGap(title) {
        // Add elements that create curiosity without being clickbait
        const curiosityElements = [
            '...', 
            ' (What happened next will surprise you)',
            ' - The unexpected truth',
            ' - You won\'t believe what happens next',
            ' - The surprising reason why',
            ' - Experts were shocked'
        ];
        
        // Only add curiosity gap if title isn't too long
        if (title.length < 80) {
            return title + curiosityElements[Math.floor(Math.random() * 3)]; // Using first 3 options to be less clickbaity
        }
        return title;
    }

    function makeConversational(title) {
        // Make the title sound more like a conversation starter
        const conversationalStarters = [
            'So, ', 
            'Here\'s ', 
            'Check out ',
            'Quick tip: ',
            'FYI: '
        ];
        
        // Only add conversational starter if it fits well
        if (title.length < 70) {
            return conversationalStarters[Math.floor(Math.random() * conversationalStarters.length)] + title;
        }
        return title;
    }

    function addSocialProof(title) {
        // Add elements that suggest social validation
        const socialProofElements = [
            ' (Most popular)',
            ' (Recommended by experts)',
            ' (Trending now)',
            ' (Fan favorite)',
            ' (Award-winning)'
        ];
        
        // Only add social proof if title isn't too long
        if (title.length < 70) {
            return title + socialProofElements[Math.floor(Math.random() * socialProofElements.length)];
        }
        return title;
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
        // Improved Flesch-Kincaid approximation for titles
        const words = title.split(/\s+/);
        if (words.length === 0) return 0;

        // Count syllables more accurately
        const syllables = words.reduce((acc, word) => {
            return acc + countSyllables(word);
        }, 0);

        // Adjust for title-specific readability
        const avgWordsPerSentence = words.length; // Titles are typically one unit
        const avgSyllablesPerWord = syllables / words.length;

        // Modified Flesch Reading Ease for shorter texts (titles)
        let score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        
        // Adjust score based on title length and complexity
        if (words.length > 10) {
            score -= 10; // Longer titles are harder to process quickly
        }
        
        // Ensure score stays within bounds
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    function countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        
        // More accurate syllable counting
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        const matches = word.match(/[aeiouy]{1,2}/g);
        const syllableCount = matches ? matches.length : 1;
        
        // Handle special cases
        if (word.endsWith('le') && word.length > 2 && !/[aeiou]le$/.test(word)) {
            return syllableCount + 1;
        }
        
        return Math.max(1, syllableCount);
    }

    function calculateEngagementScore(title, originalTitle) {
        // Calculate an engagement score based on multiple factors
        let score = 50; // Base score
        
        // Factor 1: Power words (add 5 points per power word, max 15)
        const powerWordsCount = countPowerWords(title);
        score += Math.min(powerWordsCount * 5, 15);
        
        // Factor 2: Emotional triggers (add 7 points per trigger, max 21)
        const emotionalTriggersCount = countEmotionalTriggers(title);
        score += Math.min(emotionalTriggersCount * 7, 21);
        
        // Factor 3: Question format (add 10 points if it's a question)
        if (title.endsWith('?')) {
            score += 10;
        }
        
        // Factor 4: Number inclusion (add 8 points if contains numbers)
        if (/\d+/.test(title)) {
            score += 8;
        }
        
        // Factor 5: Length optimization (add up to 10 points for optimal length)
        const optimalLength = getOptimalLengthForPlatform();
        const lengthDiff = Math.abs(title.length - optimalLength);
        if (lengthDiff <= 10) {
            score += 10 - (lengthDiff / 10) * 10;
        } else {
            score -= Math.min(lengthDiff / 5, 15); // Penalty for being too far from optimal
        }
        
        // Factor 6: Keyword preservation (add up to 5 points for keeping original keywords)
        const keywordPreservation = calculateKeywordPreservation(originalTitle, title);
        score += keywordPreservation * 5;
        
        // Ensure score stays within bounds
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    function getOptimalLengthForPlatform() {
        // Different platforms have different optimal title lengths
        const optimalLengths = {
            'x': 100,      // Twitter/X: aim for ~100 chars to allow for engagement
            'youtube': 60, // YouTube: 60 chars to fit in search results
            'instagram': 150, // Instagram: can be longer but first part matters most
            'facebook': 60   // Facebook: ~60 chars shows in feed
        };
        return optimalLengths[state.selectedPlatform] || 70;
    }

    function calculateKeywordPreservation(original, optimized) {
        // Calculate how many original keywords were preserved in the optimized version
        const originalKeywords = extractPrimaryKeywords(original);
        const optimizedLower = optimized.toLowerCase();
        
        if (originalKeywords.length === 0) return 0;
        
        let preservedCount = 0;
        for (const keyword of originalKeywords) {
            if (optimizedLower.includes(keyword.toLowerCase())) {
                preservedCount++;
            }
        }
        
        return preservedCount / originalKeywords.length;
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
        // Format the API response to match the expected HTML structure
        return analysis
            .replace(/\n##\s+(.+?)\n/g, '</div><div class="analysis-section"><div class="section-header">$1<span class="expand-icon">+</span></div><div class="section-content">')
            .replace(/\n#\s+(.+?)\n/g, '</div><div class="analysis-section"><div class="section-header">$1<span class="expand-icon">+</span></div><div class="section-content">')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n-\s+(.+?)\n/g, '<li>$1</li>')
            .replace(/\n/g, '<br>')
            .replace(/<br><\/div>/g, '</div>') // Clean up extra breaks before closing divs
            .replace(/<br><\/div>/g, '</div>') // Clean up again
            + '</div>'; // Close the last content div
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

        if (isLoading) {
            // Change button text to include loading spinner
            elements.generateBtn.innerHTML = '<span class="loading-spinner"></span> Generating...';
            elements.resultTitle.innerHTML = '<div class="loading-text show">Crafting your perfect title...</div>';
            elements.seoExplanation.innerHTML = '<div class="loading-text show">Preparing in-depth analysis...</div>';
            
            // Add fade-out animation to existing content
            elements.resultTitle.style.opacity = '0.6';
            elements.seoExplanation.style.opacity = '0.6';
        } else {
            // Restore button text
            elements.generateBtn.textContent = 'Generate SEO Title';
            
            // Remove fade effect
            elements.resultTitle.style.opacity = '1';
            elements.seoExplanation.style.opacity = '1';
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
        tooltip.style.opacity = '0';

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width/2}px`;
        tooltip.style.top = `${rect.top - 40}px`;

        document.body.appendChild(tooltip);
        
        // Fade in animation
        setTimeout(() => {
            tooltip.style.transition = 'opacity 0.3s ease';
            tooltip.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(tooltip)) {
                    tooltip.remove();
                }
            }, 300);
        }, 2000);
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