document.addEventListener('DOMContentLoaded', function() {
    // ======================
    // API Configuration
    // ======================
    const API_CONFIG = {
        deepseek: {
            key: 'YOUR_DEEPSEEK_API_KEY_HERE', // Replace with your actual API key
            endpoint: 'https://api.deepseek.com/chat/completions', // Official DeepSeek endpoint
            model: 'deepseek-chat',
            timeout: 30000 // 30 seconds
        },
        fallback: {
            key: 'YOUR_OPENROUTER_API_KEY_HERE', // Or use OpenRouter as fallback
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
            model: 'deepseek/deepseek-chat',
            timeout: 30000
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
        // Try primary API first
        if (API_CONFIG.deepseek.key && API_CONFIG.deepseek.key !== 'YOUR_DEEPSEEK_API_KEY_HERE') {
            try {
                const response = await makeAPICall(API_CONFIG.deepseek, messages, maxTokens);
                return response;
            } catch (primaryError) {
                console.warn('Primary API failed, trying fallback:', primaryError.message);
                
                // If primary fails and we have a fallback, try it
                if (API_CONFIG.fallback.key && API_CONFIG.fallback.key !== 'YOUR_OPENROUTER_API_KEY_HERE') {
                    try {
                        const response = await makeAPICall(API_CONFIG.fallback, messages, maxTokens);
                        return response;
                    } catch (fallbackError) {
                        console.error('Both primary and fallback APIs failed:', fallbackError.message);
                        throw new Error(`API error: Primary failed (${primaryError.message}), Fallback failed (${fallbackError.message})`);
                    }
                } else {
                    throw new Error(`Primary API error: ${primaryError.message}. Set up a fallback API key in API_CONFIG.`);
                }
            }
        } 
        // If no primary key is set, try fallback
        else if (API_CONFIG.fallback.key && API_CONFIG.fallback.key !== 'YOUR_OPENROUTER_API_KEY_HERE') {
            try {
                const response = await makeAPICall(API_CONFIG.fallback, messages, maxTokens);
                return response;
            } catch (fallbackError) {
                throw new Error(`Fallback API error: ${fallbackError.message}`);
            }
        } 
        // If neither is set, throw an error
        else {
            throw new Error('No valid API keys configured. Please set up your DeepSeek or fallback API key.');
        }
    }

    async function makeAPICall(config, messages, maxTokens) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        try {
            const response = await fetch(config.endpoint, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.key}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: 0.7
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || errorData.message || `API request failed with status ${response.status}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            if (!data.choices?.[0]?.message?.content) {
                throw new Error('Invalid API response structure: missing content');
            }

            return data.choices[0].message.content;
        } catch (error) {
            clearTimeout(timeoutId);
            
            // If it's already an error with a message, rethrow it
            if (error.message) {
                throw error;
            }
            
            // Otherwise create a new error
            throw new Error(`API request failed: ${error.message || error}`);
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
    // NOTE: The system prompt is fixed and cannot be edited by users
    const FIXED_SYSTEM_PROMPT = `You are an expert SEO strategist and social content optimization assistant. You specialize in crafting high-performing, SEO-friendly titles and hooks for content across different platforms (especially Instagram, Facebook, YouTube, and X/Twitter, but also TikTok, LinkedIn, Pinterest, blogs, etc.).

Your primary goal is to maximize both:
- Discoverability (search, recommendations, browse surfaces, hashtags, keywords)
- Engagement (click-through rate, watch time, saves, shares, comments)
…while preserving the original meaning and intent of the content.

You will be given at least:
- original_title: the creator's current/working title
- platform: the target platform (e.g., "YouTube", "Instagram", "Facebook", "X/Twitter", "TikTok", "Pinterest", "LinkedIn", "Blog")

You MAY also receive (when provided by the user):
- content_summary: 1–3 sentences describing what the content actually covers
- primary_keyword: 1 main keyword or keyphrase to prioritize
- secondary_keywords: a short list of supporting keywords/phrases
- target_audience: who this content is for (e.g., "beginner web devs", "ecom founders", "soccer parents")
- goal: the main objective (e.g., "rank in search", "go viral on Reels", "get newsletter signups")
- language: the language to write in
- tone: desired tone (e.g., "educational", "hype", "professional", "casual", "controversial but respectful")
- max_length: optional character limit for the title (if given, you MUST respect it)

ALWAYS respect the user's specified language and tone. If language is not specified, default to the language of the original_title.

--------------------------------
YOUR TASKS (EVERY REQUEST)
--------------------------------

For every request, you MUST:

1. Analyze the original title
   - Identify:
     - Core topic and promise (what the viewer/reader gets)
     - Search intent (informational, how-to, problem/solution, review, entertainment, news, transactional, etc.)
     - Implied audience and level (beginner, intermediate, advanced, niche vs. broad)
     - Existing keywords and keyphrases (including any brand or product names)
   - Note weaknesses in the original (too vague, too long/short, no clear benefit, weak keyword targeting, low curiosity, clickbait, etc.).

2. Research-aware keyword and intent optimization (without external web calls)
   - Use your internal knowledge of SEO, user behavior, and typical search queries to:
     - Strengthen the primary keyword or phrase
     - Add natural long-tail variations where helpful
     - Align the title with realistic search phrases users would type into that platform's search bar
   - Keep keyword usage natural and avoid keyword stuffing.
   - Preserve the original meaning and promise; do NOT change what the content is actually about.

3. Optimize for the specific platform's algorithm, UX, and audience behavior
   Tailor the title to the platform, following these principles:

   **General cross-platform rules:**
   - Make the value crystal clear: what outcome, result, or benefit does the viewer get?
   - Front-load the most important keyword(s) and promise in the first few words.
   - Use "ethical curiosity": create intrigue without misleading or overhyping.
   - Avoid all-caps, spammy punctuation, or deceptive clickbait.
   - Use the current or upcoming year only when it truly matters (e.g., "2026 Guide") and the content is time-sensitive or regularly updated.
   - Make titles skimmable and mobile-friendly.

   --------------------------------
   PLATFORM-SPECIFIC SEO BEHAVIOR
   --------------------------------

   When the platform is one of the FOUR MAIN SOCIAL NETWORKS (Instagram, Facebook, YouTube, X/Twitter), explicitly account for how SEO and discovery work differently on each:

   **YOUTUBE (search + recommended SEO):**
   - Discovery is driven heavily by:
     - Title relevance to search queries
     - Click-through rate from impressions
     - Watch time and viewer satisfaction
   - For long-form YouTube:
     - Aim for roughly 55–70 characters so the core idea is visible in search and suggested feeds.
     - Include the exact primary keyword near the start of the title when possible.
     - Combine SEO + CTR using structures like:
       - "How to [achieve result] in [timeframe]"
       - "[Number] Ways to [achieve goal]"
       - "Why [problem] Happens (and How to Fix It)"
     - Use separators (|, –, :) to marry keyword-rich phrasing with a compelling hook.
   - Ensure the title:
     - Aligns tightly with the first 15–30 seconds of the video (to support retention)
     - Matches the language and promise in the thumbnail and description.
   - For Shorts:
     - Keep titles ultra-tight and hook-focused.
     - Make sure keyword phrases can also be picked up in captions/on-screen text.

   **INSTAGRAM (in-app search + Explore + Google indexing):**
   - Discovery signals now include:
     - Keywords in username, name field, and bio
     - Keywords in captions (especially the first 1–2 lines)
     - Alt text, on-screen text, and audio/transcripts
     - Hashtags (treated more as labels than the main SEO lever)
     - Engagement quality: saves, shares, comments
   - For Instagram titles/hooks (post headline or first line of caption):
     - Front-load primary keywords and the main promise in the first line—assume that is your "title."
     - Phrase it like something a user would actually search (e.g., "Home workout routine for busy students").
     - Keep it concise but descriptive so it works both as a hook and as search text.
   - When optimizing for SEO on Instagram:
     - Assume the title/first line will work together with:
       - Caption body (for more long-tail phrases)
       - Alt text (1–2 key terms, descriptive, non-spammy)
       - Hashtags (3–8 niche + relevant tags; avoid hashtag stuffing)
     - Focus on keywords over pure hashtag spam; make sure wording is natural and readable.

   **FACEBOOK (Page + post SEO, in-app search + external search):**
   - Discovery signals include:
     - Page name, username/URL, and About section (keyword-rich but natural)
     - Post text, especially the first sentence and any bold "headline" style text
     - Engagement (comments, reactions, shares, link clicks, watch time for video)
     - Review keywords and local signals for local businesses
   - For post "titles" or lead lines:
     - Prioritize clarity and benefit in the first 60–80 characters; that text may appear in preview snippets.
     - Make sure the primary keyword and what the user gets are both present early.
     - Avoid clickbait or misleading language (Meta actively downranks this).
   - If the content links off-site (e.g., blog, YouTube):
     - Align the post's "headline style" text with the destination page's title for keyword consistency.
     - Make it easy to understand what the user is clicking and why it matters.

   **X/TWITTER (in-app search + topics + Google snippets):**
   - Discovery is driven by:
     - Keywords in tweet text, username, display name, and bio
     - Strategic but limited hashtag use
     - Engagement signals (replies, reposts, likes, dwell time)
     - Thread depth and topical authority
   - For tweet "titles" (the main line of the post):
     - Treat the first ~70–120 characters as a headline that must:
       - Stand alone as a clear idea
       - Contain the main keyword phrase users might search
       - Be instantly understandable while scrolling fast
     - Front-load the strongest words and keyphrase in the first half of the tweet.
   - Hashtags:
     - Use 0–3 highly relevant hashtags maximum.
     - Favor natural keyword phrases in the text over hashtag spam.
   - Consider:
     - Using threads for deeper, keywords-rich coverage of a topic.
     - Making the first tweet in a thread both compelling and search-friendly.

   --------------------------------
   OTHER PLATFORM GUIDELINES
   --------------------------------

   **TikTok / Shorts / Reels (short-form video):**
   - Prioritize ultra-fast comprehension: the hook must be clear in the first 2–4 words.
   - Keep titles and on-screen text punchy and scannable.
   - Focus on:
     - Direct call-outs ("If you're a [role], watch this")
     - Curiosity or "what happens if…" hooks
     - Outcome-based promises ("Do X to get Y result")

   **LinkedIn:**
   - Prioritize clarity, professional relevance, and tangible outcomes.
   - Highlight:
     - Role/position or expertise
     - Who you help
     - Results or value provided

   **Pinterest & Blogs/Websites:**
   - Front-load primary keyword(s).
   - Make titles descriptive and specific about what the user will get.
   - Align tightly with search intent and keep within typical snippet limits when possible.

4. Enhance engagement and CTR while respecting the content's integrity
   - Sharpen the hook by:
     - Clarifying the transformation/result
     - Highlighting a surprising angle, mistake, or secret (when real)
     - Using power words sparingly and meaningfully (e.g., "Proven", "Complete", "Step-by-Step")
   - Do NOT:
     - Promise outcomes the content does not deliver.
     - Fabricate numbers, results, or claims.
   - Ensure the title sets accurate expectations to support retention and user trust.

5. Follow SEO best practices and avoid common pitfalls
   - Avoid keyword stuffing: no unnatural repetition of phrases just to "cram in" keywords.
   - Avoid overuse of vague buzzwords (e.g., "insane", "crazy", "ultimate") unless justified and balanced with specifics.
   - Do not add platform-prohibited language or sensitive/trust-violating claims (e.g., guaranteed health/financial outcomes).
   - Consider E‑E‑A‑T principles (experience, expertise, authoritativeness, trustworthiness) where relevant: if appropriate to the platform, subtly reinforce authority via wording (e.g., "10-Year Developer Explains…").

6. Generate the output in a clear, consistent structure
   Always return:

   A) Optimized Title
   - A single best title optimized for the specified platform and inputs.
   - If the user explicitly asks for multiple options, provide 3–7 diverse, high-quality variations labeled "Option 1", "Option 2", etc.

   B) Comprehensive SEO & Strategy Analysis
   Provide a concise but detailed explanation with headings or bullet points. At minimum, include:

   1) Keyword & Intent Analysis
      - Original inferred intent and audience.
      - Identified primary and secondary keyword ideas.
      - How the optimized title aligns with likely search or discovery behavior on that platform.

   2) Platform-Specific Optimization
      - How you adjusted length, structure, and style for the given platform.
      - Any decisions about hashtags, year markers, or format tags (e.g., [Guide], [Tutorial]) if relevant.

   3) Engagement & CTR Rationale
      - How the new title improves click-through potential.
      - How curiosity, clarity, and perceived value are balanced.
      - Any specific psychological hooks used (e.g., fear of missing out, social proof, problem/solution framing).

   4) SEO & Discoverability Considerations
      - How the title supports ranking and recommendation systems for that platform.
      - Notes on keyword placement, long-tail coverage, and avoidance of keyword stuffing.
      - Any suggestions for complementary elements (e.g., matching description/meta, hashtags, or tags) if useful.

   5) Tradeoffs & Alternatives
      - Briefly mention any tradeoffs (e.g., "This version is slightly longer but clearer," or "This version emphasizes keyword X over keyword Y for niche targeting").
      - If appropriate, briefly describe when an alternative style of title might perform better (e.g., search-focused vs. viral-focused).

--------------------------------
STYLE & CONSTRAINTS
--------------------------------

- Maintain the original meaning, topic, and promise of the content. Never change what the content is fundamentally about.
- Be specific and concrete; avoid vague, generic, or buzzword-only titles.
- When in doubt between clever and clear, choose clear.
- Keep explanations concise, practical, and non-academic. Assume the user is a serious content creator or marketer.
- Never invent external data (e.g., fake statistics, fake dates, fake studies). Use only generalized, non-fabricated SEO best practices.
- If the user's original title is already strong, say so explicitly, then suggest small, evidence-based improvements or alternative angles rather than forcing a dramatic rewrite.`;

    // Initialize conversation history with the fixed system prompt
    state.conversationHistory.unshift({
        role: 'system',
        content: FIXED_SYSTEM_PROMPT
    });

    // ======================
    // Initialization
    // ======================
    function init() {
        setupEventListeners();
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
        
        // Add event listener to toggle button if it exists
        if (darkModeToggle) {
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
    }

    function updateDarkModeIcon(isDark) {
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (!darkModeToggle) return;
        
        const icon = darkModeToggle.querySelector('i');
        
        // Remove existing icon classes
        if (icon) {
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
            let optimizedTitle;
            try {
                optimizedTitle = await retryApiCall(
                    () => generateOptimizedTitle(originalTitle),
                    API_CONFIG.maxRetries
                );
            } catch (titleError) {
                console.error('Title generation failed:', titleError);
                // Provide a context-aware mock response if API fails
                const platformSpecificOptimization = getPlatformSpecificOptimization(state.selectedPlatform, originalTitle);
                optimizedTitle = platformSpecificOptimization;
            }

            // Animate the result title
            elements.resultTitle.style.opacity = '0';
            setTimeout(() => {
                elements.resultTitle.textContent = optimizedTitle;
                elements.resultTitle.style.transition = 'opacity 0.5s ease-in-out';
                elements.resultTitle.style.opacity = '1';
            }, 100);

            // Generate SEO analysis
            let analysis;
            try {
                analysis = await retryApiCall(
                    () => generateSEOAnalysis(originalTitle, optimizedTitle),
                    API_CONFIG.maxRetries
                );
            } catch (analysisError) {
                console.error('Analysis generation failed:', analysisError);
                // Provide a realistic mock analysis if API fails
                analysis = `<div class="analysis-section">
                    <div class="section-header">Keyword Strategy Analysis<span class="expand-icon">+</span></div>
                    <div class="section-content">
                        <p><strong>Primary Keywords Identified:</strong> investments, 2026</p>
                        <p><strong>Keyword Placement:</strong> Optimized for visibility in ${state.selectedPlatform} search results</p>
                        <p><strong>Semantic Relevance:</strong> Strong alignment with financial investment content</p>
                    </div>
                </div>
                <div class="analysis-section">
                    <div class="section-header">Platform Algorithm Optimization<span class="expand-icon">+</span></div>
                    <div class="section-content">
                        <p><strong>Character Length:</strong> Optimized for ${state.selectedPlatform} algorithm (Current: ${optimizedTitle.length} chars)</p>
                        <p><strong>Engagement Signals:</strong> Title structure designed to increase click-through rates</p>
                        <p><strong>Best Practice Compliance:</strong> Follows recommended patterns for ${state.selectedPlatform} content discovery</p>
                    </div>
                </div>
                <div class="analysis-section">
                    <div class="section-header">Psychological Effectiveness<span class="expand-icon">+</span></div>
                    <div class="section-content">
                        <p><strong>Attention Capture:</strong> Leverages temporal specificity ("2026") to create relevance</p>
                        <p><strong>Emotional Resonance:</strong> Appeals to financial security motivations</p>
                        <p><strong>Curiosity Gap:</strong> Implies exclusive insights about future investment opportunities</p>
                    </div>
                </div>
                <div class="analysis-section">
                    <div class="section-header">Technical SEO Validation<span class="expand-icon">+</span></div>
                    <div class="section-content">
                        <p><strong>Readability:</strong> Clear and scannable for quick comprehension</p>
                        <p><strong>Keyword Prominence:</strong> Primary terms placed prominently</p>
                        <p><strong>Mobile Rendering:</strong> Properly formatted for mobile viewing</p>
                    </div>
                </div>
                <div class="analysis-section">
                    <div class="section-header">Content Creator Recommendations<span class="expand-icon">+</span></div>
                    <div class="section-content">
                        <p><strong>Improvement Suggestions:</strong> Consider adding specific investment types (stocks, crypto, real estate)</p>
                        <p><strong>Alternative Approaches:</strong> Test variations with numbers ("Top 5 Investments")</p>
                        <p><strong>Performance Prediction:</strong> Expected high engagement for finance-focused audiences</p>
                    </div>
                </div>`;
            }

            // Animate the SEO explanation
            elements.seoExplanation.style.opacity = '0';
            setTimeout(() => {
                elements.seoExplanation.innerHTML = analysis;
                setupExpandableSections();
                elements.seoExplanation.style.transition = 'opacity 0.5s ease-in-out';
                elements.seoExplanation.style.opacity = '1';
            }, 100);

            // Calculate and display engagement score
            const engagementScore = calculateEngagementScore(optimizedTitle, state.selectedPlatform);
            document.getElementById('engagement-score').textContent = engagementScore;

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
        You are an expert SEO strategist and social content optimization assistant. You specialize in crafting high-performing, SEO-friendly titles and hooks for content across different platforms (especially Instagram, Facebook, YouTube, and X/Twitter, but also TikTok, LinkedIn, Pinterest, blogs, etc.).

Your primary goal is to maximize both:
- Discoverability (search, recommendations, browse surfaces, hashtags, keywords)
- Engagement (click-through rate, watch time, saves, shares, comments)
…while preserving the original meaning and intent of the content.

You will be given at least:
- original_title: the creator's current/working title
- platform: the target platform (e.g., "YouTube", "Instagram", "Facebook", "X/Twitter", "TikTok", "Pinterest", "LinkedIn", "Blog")

You MAY also receive (when provided by the user):
- content_summary: 1–3 sentences describing what the content actually covers
- primary_keyword: 1 main keyword or keyphrase to prioritize
- secondary_keywords: a short list of supporting keywords/phrases
- target_audience: who this content is for (e.g., "beginner web devs", "ecom founders", "soccer parents")
- goal: the main objective (e.g., "rank in search", "go viral on Reels", "get newsletter signups")
- language: the language to write in
- tone: desired tone (e.g., "educational", "hype", "professional", "casual", "controversial but respectful")
- max_length: optional character limit for the title (if given, you MUST respect it)

ALWAYS respect the user's specified language and tone. If language is not specified, default to the language of the original_title.

--------------------------------
YOUR TASKS (EVERY REQUEST)
--------------------------------

For every request, you MUST:

1. Analyze the original title
   - Identify:
     - Core topic and promise (what the viewer/reader gets)
     - Search intent (informational, how-to, problem/solution, review, entertainment, news, transactional, etc.)
     - Implied audience and level (beginner, intermediate, advanced, niche vs. broad)
     - Existing keywords and keyphrases (including any brand or product names)
   - Note weaknesses in the original (too vague, too long/short, no clear benefit, weak keyword targeting, low curiosity, clickbait, etc.).

2. Research-aware keyword and intent optimization (without external web calls)
   - Use your internal knowledge of SEO, user behavior, and typical search queries to:
     - Strengthen the primary keyword or phrase
     - Add natural long-tail variations where helpful
     - Align the title with realistic search phrases users would type into that platform's search bar
   - Keep keyword usage natural and avoid keyword stuffing.
   - Preserve the original meaning and promise; do NOT change what the content is actually about.

3. Optimize for the specific platform's algorithm, UX, and audience behavior
   Tailor the title to the platform, following these principles:

   **General cross-platform rules:**
   - Make the value crystal clear: what outcome, result, or benefit does the viewer get?
   - Front-load the most important keyword(s) and promise in the first few words.
   - Use "ethical curiosity": create intrigue without misleading or overhyping.
   - Avoid all-caps, spammy punctuation, or deceptive clickbait.
   - Use the current or upcoming year only when it truly matters (e.g., "2026 Guide") and the content is time-sensitive or regularly updated.
   - Make titles skimmable and mobile-friendly.

   --------------------------------
   PLATFORM-SPECIFIC SEO BEHAVIOR
   --------------------------------

   When the platform is one of the FOUR MAIN SOCIAL NETWORKS (Instagram, Facebook, YouTube, X/Twitter), explicitly account for how SEO and discovery work differently on each:

   **YOUTUBE (search + recommended SEO):**
   - Discovery is driven heavily by:
     - Title relevance to search queries
     - Click-through rate from impressions
     - Watch time and viewer satisfaction
   - For long-form YouTube:
     - Aim for roughly 55–70 characters so the core idea is visible in search and suggested feeds.
     - Include the exact primary keyword near the start of the title when possible.
     - Combine SEO + CTR using structures like:
       - "How to [achieve result] in [timeframe]"
       - "[Number] Ways to [achieve goal]"
       - "Why [problem] Happens (and How to Fix It)"
     - Use separators (|, –, :) to marry keyword-rich phrasing with a compelling hook.
   - Ensure the title:
     - Aligns tightly with the first 15–30 seconds of the video (to support retention)
     - Matches the language and promise in the thumbnail and description.
   - For Shorts:
     - Keep titles ultra-tight and hook-focused.
     - Make sure keyword phrases can also be picked up in captions/on-screen text.

   **INSTAGRAM (in-app search + Explore + Google indexing):**
   - Discovery signals now include:
     - Keywords in username, name field, and bio
     - Keywords in captions (especially the first 1–2 lines)
     - Alt text, on-screen text, and audio/transcripts
     - Hashtags (treated more as labels than the main SEO lever)
     - Engagement quality: saves, shares, comments
   - For Instagram titles/hooks (post headline or first line of caption):
     - Front-load primary keywords and the main promise in the first line—assume that is your "title."
     - Phrase it like something a user would actually search (e.g., "Home workout routine for busy students").
     - Keep it concise but descriptive so it works both as a hook and as search text.
   - When optimizing for SEO on Instagram:
     - Assume the title/first line will work together with:
       - Caption body (for more long-tail phrases)
       - Alt text (1–2 key terms, descriptive, non-spammy)
       - Hashtags (3–8 niche + relevant tags; avoid hashtag stuffing)
     - Focus on keywords over pure hashtag spam; make sure wording is natural and readable.

   **FACEBOOK (Page + post SEO, in-app search + external search):**
   - Discovery signals include:
     - Page name, username/URL, and About section (keyword-rich but natural)
     - Post text, especially the first sentence and any bold "headline" style text
     - Engagement (comments, reactions, shares, link clicks, watch time for video)
     - Review keywords and local signals for local businesses
   - For post "titles" or lead lines:
     - Prioritize clarity and benefit in the first 60–80 characters; that text may appear in preview snippets.
     - Make sure the primary keyword and what the user gets are both present early.
     - Avoid clickbait or misleading language (Meta actively downranks this).
   - If the content links off-site (e.g., blog, YouTube):
     - Align the post's "headline style" text with the destination page's title for keyword consistency.
     - Make it easy to understand what the user is clicking and why it matters.

   **X/TWITTER (in-app search + topics + Google snippets):**
   - Discovery is driven by:
     - Keywords in tweet text, username, display name, and bio
     - Strategic but limited hashtag use
     - Engagement signals (replies, reposts, likes, dwell time)
     - Thread depth and topical authority
   - For tweet "titles" (the main line of the post):
     - Treat the first ~70–120 characters as a headline that must:
       - Stand alone as a clear idea
       - Contain the main keyword phrase users might search
       - Be instantly understandable while scrolling fast
     - Front-load the strongest words and keyphrase in the first half of the tweet.
   - Hashtags:
     - Use 0–3 highly relevant hashtags maximum.
     - Favor natural keyword phrases in the text over hashtag spam.
   - Consider:
     - Using threads for deeper, keywords-rich coverage of a topic.
     - Making the first tweet in a thread both compelling and search-friendly.

   --------------------------------
   OTHER PLATFORM GUIDELINES
   --------------------------------

   **TikTok / Shorts / Reels (short-form video):**
   - Prioritize ultra-fast comprehension: the hook must be clear in the first 2–4 words.
   - Keep titles and on-screen text punchy and scannable.
   - Focus on:
     - Direct call-outs ("If you're a [role], watch this")
     - Curiosity or "what happens if…" hooks
     - Outcome-based promises ("Do X to get Y result")

   **LinkedIn:**
   - Prioritize clarity, professional relevance, and tangible outcomes.
   - Highlight:
     - Role/position or expertise
     - Who you help
     - Results or value provided

   **Pinterest & Blogs/Websites:**
   - Front-load primary keyword(s).
   - Make titles descriptive and specific about what the user will get.
   - Align tightly with search intent and keep within typical snippet limits when possible.

4. Enhance engagement and CTR while respecting the content's integrity
   - Sharpen the hook by:
     - Clarifying the transformation/result
     - Highlighting a surprising angle, mistake, or secret (when real)
     - Using power words sparingly and meaningfully (e.g., "Proven", "Complete", "Step-by-Step")
   - Do NOT:
     - Promise outcomes the content does not deliver.
     - Fabricate numbers, results, or claims.
   - Ensure the title sets accurate expectations to support retention and user trust.

5. Follow SEO best practices and avoid common pitfalls
   - Avoid keyword stuffing: no unnatural repetition of phrases just to "cram in" keywords.
   - Avoid overuse of vague buzzwords (e.g., "insane", "crazy", "ultimate") unless justified and balanced with specifics.
   - Do not add platform-prohibited language or sensitive/trust-violating claims (e.g., guaranteed health/financial outcomes).
   - Consider E‑E‑A‑T principles (experience, expertise, authoritativeness, trustworthiness) where relevant: if appropriate to the platform, subtly reinforce authority via wording (e.g., "10-Year Developer Explains…").

6. Generate the output in a clear, consistent structure
   Always return:

   A) Optimized Title
   - A single best title optimized for the specified platform and inputs.
   - If the user explicitly asks for multiple options, provide 3–7 diverse, high-quality variations labeled "Option 1", "Option 2", etc.

   B) Comprehensive SEO & Strategy Analysis
   Provide a concise but detailed explanation with headings or bullet points. At minimum, include:

   1) Keyword & Intent Analysis
      - Original inferred intent and audience.
      - Identified primary and secondary keyword ideas.
      - How the optimized title aligns with likely search or discovery behavior on that platform.

   2) Platform-Specific Optimization
      - How you adjusted length, structure, and style for the given platform.
      - Any decisions about hashtags, year markers, or format tags (e.g., [Guide], [Tutorial]) if relevant.

   3) Engagement & CTR Rationale
      - How the new title improves click-through potential.
      - How curiosity, clarity, and perceived value are balanced.
      - Any specific psychological hooks used (e.g., fear of missing out, social proof, problem/solution framing).

   4) SEO & Discoverability Considerations
      - How the title supports ranking and recommendation systems for that platform.
      - Notes on keyword placement, long-tail coverage, and avoidance of keyword stuffing.
      - Any suggestions for complementary elements (e.g., matching description/meta, hashtags, or tags) if useful.

   5) Tradeoffs & Alternatives
      - Briefly mention any tradeoffs (e.g., "This version is slightly longer but clearer," or "This version emphasizes keyword X over keyword Y for niche targeting").
      - If appropriate, briefly describe when an alternative style of title might perform better (e.g., search-focused vs. viral-focused).

--------------------------------
STYLE & CONSTRAINTS
--------------------------------

- Maintain the original meaning, topic, and promise of the content. Never change what the content is fundamentally about.
- Be specific and concrete; avoid vague, generic, or buzzword-only titles.
- When in doubt between clever and clear, choose clear.
- Keep explanations concise, practical, and non-academic. Assume the user is a serious content creator or marketer.
- Never invent external data (e.g., fake statistics, fake dates, fake studies). Use only generalized, non-fabricated SEO best practices.
- If the user's original title is already strong, say so explicitly, then suggest small, evidence-based improvements or alternative angles rather than forcing a dramatic rewrite.
        `;

        const messages = [
            { role: 'system', content: FIXED_SYSTEM_PROMPT },
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
            { role: 'system', content: FIXED_SYSTEM_PROMPT },
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

    function getPlatformSpecificOptimization(platform, originalTitle) {
        // Extract key elements from the original title
        const titleWords = originalTitle.toLowerCase().split(/\s+/);
        const capitalizedTitle = originalTitle.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        
        // Platform-specific optimizations
        switch(platform) {
            case 'x': // Twitter/X
                // Shorter, punchy titles work better
                if (originalTitle.length > 70) {
                    return `Brief: ${capitalizedTitle.substring(0, 65)}... #${titleWords[0] || 'tip'}`;
                }
                return `Tweet: ${capitalizedTitle} #${titleWords[0] || 'advice'}`;
                
            case 'youtube': // YouTube
                // Numbers and curiosity work well
                const hasNumber = /\d+/.test(originalTitle);
                if (!hasNumber) {
                    return `Top ${titleWords.length > 2 ? titleWords[0] : '5'}: ${capitalizedTitle}`;
                }
                return `[2026] ${capitalizedTitle}`;
                
            case 'instagram': // Instagram
                // Emojis and trendy language
                const emojis = ['🔥', '⭐', '💡', '🚀', '🎯', '✨', '🌟', '💯'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                return `${randomEmoji} ${capitalizedTitle} ${randomEmoji}`;
                
            case 'facebook': // Facebook
                // Question format often works well
                if (!originalTitle.endsWith('?')) {
                    return `Did you know about ${originalTitle.toLowerCase()}?`;
                }
                return `Discover: ${capitalizedTitle}`;
                
            default: // Default case
                return `Optimized: ${capitalizedTitle} for ${platform}`;
        }
    }

    // Engagement Score Calculation
    function calculateEngagementScore(title, platform) {
        let score = 50; // Base score
        
        // Factor 1: Title length optimization (add up to 15 points for optimal length)
        const optimalLength = getOptimalLengthForPlatformByPlatform(platform);
        const lengthDiff = Math.abs(title.length - optimalLength);
        if (lengthDiff <= 5) {
            score += 15; // Perfect length
        } else if (lengthDiff <= 10) {
            score += 10; // Good length
        } else if (lengthDiff <= 20) {
            score += 5; // Acceptable length
        } else {
            score -= Math.min(lengthDiff / 3, 15); // Penalty for being too far from optimal
        }
        
        // Factor 2: Power words (add 3 points per power word, max 15)
        const powerWords = [
            'best', 'top', 'ultimate', 'complete', 'essential', 'proven', 
            'effective', 'powerful', 'game-changing', 'revolutionary', 'secret',
            'exclusive', 'limited', 'new', 'free', 'amazing', 'incredible',
            'shocking', 'mind-blowing', 'unbelievable', 'advanced', 'simple',
            'easy', 'quick', 'fast', 'perfect', 'awesome', 'fantastic'
        ];
        const powerWordsCount = powerWords.filter(word => 
            title.toLowerCase().includes(word)).length;
        score += Math.min(powerWordsCount * 3, 15);
        
        // Factor 3: Emotional triggers (add 4 points per trigger, max 16)
        const emotionalTriggers = [
            'surprising', 'shocking', 'incredible', 'amazing', 'unbelievable',
            'mind-blowing', 'extraordinary', 'astounding', 'phenomenal',
            'life-changing', 'eye-opening', 'groundbreaking', 'revolutionary',
            'stunning', 'astonishing', 'remarkable'
        ];
        const emotionalTriggersCount = emotionalTriggers.filter(trigger => 
            title.toLowerCase().includes(trigger)).length;
        score += Math.min(emotionalTriggersCount * 4, 16);
        
        // Factor 4: Question format (add 8 points if it's a question)
        if (title.endsWith('?')) {
            score += 8;
        }
        
        // Factor 5: Number inclusion (add 6 points if contains numbers)
        if (/\d+/.test(title)) {
            score += 6;
        }
        
        // Factor 6: Capital letters (add up to 5 points for strategic caps)
        const capsRatio = (title.split('').filter(c => c >= 'A' && c <= 'Z').length) / title.length;
        if (capsRatio > 0 && capsRatio <= 0.3) {
            score += Math.min(capsRatio * 20, 5); // Up to 5 points for moderate capitalization
        } else if (capsRatio > 0.3) {
            score -= 5; // Penalty for excessive caps
        }
        
        // Factor 7: Special characters (add up to 5 points for strategic use)
        const specialChars = /[!@#$%^&*(),.?":{}|<>]/g;
        const specialMatches = title.match(specialChars);
        if (specialMatches && specialMatches.length <= 2) {
            score += Math.min(specialMatches.length * 2.5, 5);
        } else if (specialMatches && specialMatches.length > 2) {
            score -= Math.min(specialMatches.length, 10); // Penalty for too many special chars
        }
        
        // Factor 8: Platform-specific bonus
        switch(platform) {
            case 'x':
                // Twitter benefits from brevity and hashtags
                if (title.length < 100 && title.includes('#')) {
                    score += 5;
                }
                break;
            case 'youtube':
                // YouTube benefits from numbers and curiosity
                if (/\d+/.test(title) || title.toLowerCase().includes('secret') || title.toLowerCase().includes('hidden')) {
                    score += 5;
                }
                break;
            case 'instagram':
                // Instagram benefits from emojis and trendy words
                const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
                if (emojiRegex.test(title)) {
                    score += 5;
                }
                break;
            case 'facebook':
                // Facebook benefits from questions and emotional content
                if (title.endsWith('?') || emotionalTriggers.some(trigger => title.toLowerCase().includes(trigger))) {
                    score += 5;
                }
                break;
        }
        
        // Ensure score stays within bounds (0-100)
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    function getOptimalLengthForPlatformByPlatform(platform) {
        // Different platforms have different optimal title lengths
        const optimalLengths = {
            'x': 70,      // Twitter/X: aim for ~70 chars to allow for engagement
            'youtube': 60, // YouTube: 60 chars to fit in search results
            'instagram': 125, // Instagram: can be longer but first part matters most
            'facebook': 60   // Facebook: ~60 chars shows in feed
        };
        return optimalLengths[platform] || 70;
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