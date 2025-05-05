document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle Functionality
    const themeBtn = document.getElementById('theme-btn');
    
    if (themeBtn) {
        // Check for saved theme preference or use default
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        // Toggle theme when button is clicked
        themeBtn.addEventListener('click', function() {
            const isDark = document.body.classList.toggle('dark-theme');
            
            // Update button icon
            if (isDark) {
                themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
                localStorage.setItem('theme', 'dark');
            } else {
                themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // File upload functionality
    const fileInput = document.getElementById('audio-file');
    const fileDropArea = document.querySelector('.file-drop-area');
    const fileName = document.querySelector('.file-name');
    const removeFileBtn = document.querySelector('.remove-file');
    
    if (fileInput && fileDropArea) {
        // Show file name when file selected
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                fileName.textContent = fileInput.files[0].name;
                fileDropArea.classList.add('has-file');
            } else {
                resetFileInput();
            }
        });
        
        // Handle drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            fileDropArea.classList.add('highlight');
        }
        
        function unhighlight() {
            fileDropArea.classList.remove('highlight');
        }
        
        fileDropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0 && files[0].type.startsWith('audio/')) {
                fileInput.files = files;
                fileName.textContent = files[0].name;
                fileDropArea.classList.add('has-file');
            }
        }
        
        // Remove file
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering file selection
                resetFileInput();
            });
        }
        
        function resetFileInput() {
            fileInput.value = '';
            fileName.textContent = '';
            fileDropArea.classList.remove('has-file');
        }
    }
    
    // Text to Speech form submission
    const ttsForm = document.getElementById('tts-form');
    const audioResult = document.getElementById('audio-result');
    const audioPlayerContainer = document.getElementById('audio-player-container');
    const resetTextBtn = document.getElementById('reset-text-btn');
    
    if (ttsForm) {
        ttsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show loading state
            const submitBtn = ttsForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;
            
            // Add a feedback container if it doesn't exist
            let feedbackEl = document.getElementById('tts-feedback');
            if (!feedbackEl) {
                feedbackEl = document.createElement('div');
                feedbackEl.id = 'tts-feedback';
                feedbackEl.className = 'alert mt-3';
                feedbackEl.style.display = 'none';
                ttsForm.appendChild(feedbackEl);
            }
            
            try {
                const formData = new FormData(ttsForm);
                
                // Get the quality value from your selector and add it to formData
                const qualitySelector = document.getElementById('quality');
                if (qualitySelector) {
                    formData.append('quality', qualitySelector.value);
                }
                
                const response = await fetch('/speak', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(errorData || 'Server returned error');
                }
                
                const audioPath = await response.text();
                
                // Create custom audio player
                audioPlayerContainer.innerHTML = `
                    <div class="custom-audio-player">
                        <audio id="audio-element" src="${audioPath}" preload="metadata"></audio>
                        
                        <div class="player-controls">
                            <button id="play-btn" class="play-btn">
                                <i class="fas fa-play"></i>
                            </button>
                            
                            <div class="player-progress">
                                <div class="time current-time">0:00</div>
                                <div class="progress-bar-wrapper">
                                    <div class="progress-bar">
                                        <div class="progress-indicator"></div>
                                    </div>
                                </div>
                                <div class="time duration">0:00</div>
                            </div>
                            
                            <div class="volume-control">
                                <button id="mute-btn" class="mute-btn">
                                    <i class="fas fa-volume-up"></i>
                                </button>
                                <div class="volume-slider-wrapper">
                                    <div class="volume-slider">
                                        <div class="volume-indicator"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="file-info">
                            <span class="filename">${audioPath.split('/').pop()}</span>
                        </div>
                    </div>
                `;
                
                // Setup download link
                const downloadLink = document.getElementById('download-link');
                downloadLink.href = audioPath;
                
                // Show result container
                audioResult.style.display = 'block';
                
                // Initialize custom player
                initCustomPlayer();

                // Success feedback
                feedbackEl.className = 'alert alert-success mt-3';
                feedbackEl.textContent = 'Audio generated successfully!';
                feedbackEl.style.display = 'block';
                setTimeout(() => { feedbackEl.style.display = 'none'; }, 5000);
                
            } catch (error) {
                console.error('Error:', error);
                
                // Error feedback to user
                feedbackEl.className = 'alert alert-danger mt-3';
                feedbackEl.textContent = `Error: ${error.message || 'Something went wrong'}`;
                feedbackEl.style.display = 'block';
                
            } finally {
                // Reset button state
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
        
        // Reset text form
        if (resetTextBtn) {
            resetTextBtn.addEventListener('click', () => {
                ttsForm.reset();
                if (charCounter) charCounter.textContent = '0';
                audioResult.style.display = 'none';
            });
        }
    }
    
    // Speech to Text form submission
    const sttForm = document.getElementById('stt-form');
    const textResult = document.getElementById('text-result');
    const resultText = document.getElementById('result-text');
    const resetFileBtn = document.getElementById('reset-file-btn');
    
    if (sttForm) {
        sttForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show loading state
            const submitBtn = sttForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;
            
            try {
                const formData = new FormData(sttForm);
                
                const response = await fetch('/recognize', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Server returned error');
                }
                
                const data = await response.json();
                
                // Show result
                textResult.style.display = 'block';
                
                if (data.error) {
                    resultText.innerHTML = `<p class="error">${data.error}</p>`;
                } else {
                    resultText.innerHTML = `<p>${data.text}</p>`;
                }
                
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred during conversion. Please try again.');
            } finally {
                // Reset button state
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
        
        // Reset file form
        if (resetFileBtn) {
            resetFileBtn.addEventListener('click', () => {
                sttForm.reset();
                resetFileInput();
                textResult.style.display = 'none';
            });
        }
    }
    
    // Copy to clipboard functionality
    const copyBtn = document.getElementById('copy-btn');
    
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const text = resultText.innerText;
            if (text && !text.includes('Your transcribed text will appear here')) {
                navigator.clipboard.writeText(text)
                    .then(() => {
                        // Show success state
                        const originalBtnText = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        
                        setTimeout(() => {
                            copyBtn.innerHTML = originalBtnText;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Could not copy text: ', err);
                    });
            }
        });
    }
    
    // Clear text result
    const clearBtn = document.getElementById('clear-btn');
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            resultText.innerHTML = '<p class="placeholder">Your transcribed text will appear here...</p>';
            textResult.style.display = 'none';
        });
    }

    // Fade in main content
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.classList.add('fade-in');
    }

    // Fade in the main content with a slight delay
    const container = document.querySelector('.container');
    if (container) {
        setTimeout(() => {
            container.classList.add('fade-in');
        }, 100);
    }
    
    // Add pulse effect to the TTS submit button
    const submitBtn = document.querySelector('#ttsForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.classList.add('pulse-on-hover');
    }
    
    // Enhance the audio player with animations
    const customPlayer = document.querySelector('.custom-audio-player');
    if (customPlayer) {
        customPlayer.classList.add('player-enhanced');
    }

    // Animate text elements with a staggered effect
    animateTextElements();
    
    // Add scroll effects
    setupScrollEffects();

    validateTTSForm();

    enhanceAccessibility();

    // Track TTS submissions
    const ttsFormAnalytics = document.getElementById('ttsForm');
    if (ttsFormAnalytics) {
        ttsFormAnalytics.addEventListener('submit', () => {
            trackEvent('TTS', 'generate', document.getElementById('quality-selector')?.value);
        });
    }
    
    // Track audio playback
    const audioElementAnalytics = document.getElementById('audio-element');
    if (audioElementAnalytics) {
        audioElementAnalytics.addEventListener('play', () => trackEvent('Audio', 'play'));
        audioElementAnalytics.addEventListener('pause', () => trackEvent('Audio', 'pause'));
        audioElementAnalytics.addEventListener('ended', () => trackEvent('Audio', 'complete'));
    }

    // Initialize translator widget
    initTranslator();

    // Initialize text translator
    initTextTranslator();
});

// Custom Audio Player functionality
function initCustomPlayer() {
    const audioElement = document.getElementById('audio-element');
    const playBtn = document.getElementById('play-btn');
    const muteBtn = document.getElementById('mute-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progressIndicator = document.querySelector('.progress-indicator');
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeIndicator = document.querySelector('.volume-indicator');
    const currentTimeEl = document.querySelector('.current-time');
    const durationEl = document.querySelector('.duration');
    
    if (!audioElement || !playBtn) return;
    
    // Initialize with default state
    let isPlaying = false;
    let isMuted = false;
    
    // Update audio duration once metadata is loaded
    audioElement.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audioElement.duration);
    });
    
    // Play/Pause button
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            audioElement.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            playBtn.classList.remove('playing');
            isPlaying = false;
            
            // Stop the audio visualizer
            document.querySelector('.audio-visualizer')?.classList.remove('playing');
        } else {
            audioElement.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playBtn.classList.add('playing');
            isPlaying = true;
            
            // Activate the audio visualizer
            document.querySelector('.audio-visualizer')?.classList.add('playing');
        }
    });
    
    // Mute button
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        audioElement.muted = isMuted;
        
        if (isMuted) {
            muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            volumeIndicator.style.width = '0%';
        } else {
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            volumeIndicator.style.width = (audioElement.volume * 100) + '%';
        }
    });
    
    // Progress bar click
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = pos * audioElement.duration;
    });
    
    // Volume slider click
    volumeSlider.addEventListener('click', (e) => {
        const rect = volumeSlider.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioElement.volume = Math.max(0, Math.min(1, pos));
        volumeIndicator.style.width = (audioElement.volume * 100) + '%';
        
        // Update mute button icon based on volume
        if (audioElement.volume === 0) {
            muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            isMuted = true;
        } else {
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            isMuted = false;
        }
    });
    
    // Time update
    audioElement.addEventListener('timeupdate', () => {
        const currentTime = audioElement.currentTime;
        const duration = audioElement.duration || 1;
        const progressPercent = (currentTime / duration) * 100;
        
        progressIndicator.style.width = progressPercent + '%';
        currentTimeEl.textContent = formatTime(currentTime);
    });
    
    // When audio ends
    audioElement.addEventListener('ended', () => {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playBtn.classList.remove('playing');
        isPlaying = false;
        progressIndicator.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        
        // Stop the audio visualizer
        document.querySelector('.audio-visualizer')?.classList.remove('playing');
    });
    
    // Autoplay
    audioElement.play().then(() => {
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playBtn.classList.add('playing');
        isPlaying = true;
        document.querySelector('.audio-visualizer')?.classList.add('playing');
    }).catch(err => {
        console.log('Autoplay prevented by browser:', err);
    });

    // Add enhanced visualizer
    setupEnhancedVisualizer();
}

// Format seconds to MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// In your JavaScript, capture the quality setting
function handleTTSRequest() {
  const text = document.getElementById('text-input').value;
  const quality = document.getElementById('quality-selector').value;
  
  // Send to your backend
  fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      quality: quality
    }),
  })
  .then(response => response.json())
  .then(data => {
    // Handle the response
  });
}

// Add this new function to create an enhanced audio visualizer
function setupEnhancedVisualizer() {
    const audioElement = document.getElementById('audio-element');
    if (!audioElement) return;
    
    // Create or get visualizer container
    let visualizer = document.querySelector('.audio-visualizer');
    if (!visualizer) {
        visualizer = document.createElement('div');
        visualizer.className = 'audio-visualizer';
        const playerControls = document.querySelector('.custom-audio-player');
        if (playerControls) {
            playerControls.appendChild(visualizer);
        }
    }
    
    // Clear and create new bars
    visualizer.innerHTML = '';
    const barCount = 16;
    
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        visualizer.appendChild(bar);
    }
    
    // Animate bars when audio is playing
    function animateBars() {
        if (!audioElement.paused) {
            const bars = visualizer.querySelectorAll('.visualizer-bar');
            bars.forEach(bar => {
                const height = Math.floor(Math.random() * 40) + 5;
                bar.style.height = `${height}px`;
            });
            
            requestAnimationFrame(animateBars);
        }
    }
    
    // Start/stop animation based on audio state
    audioElement.addEventListener('play', animateBars);
}

// Function to animate text elements
function animateTextElements() {
    // Get all headings and paragraphs
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, .card-title, .card-text');
    
    // Apply animation classes with staggered delay
    textElements.forEach((element, index) => {
        // Add the base animation class
        element.classList.add('text-animate');
        
        // Set a staggered delay based on element position
        element.style.animationDelay = `${0.1 + (index * 0.05)}s`;
    });
}

// Function to handle scroll effects
function setupScrollEffects() {
    // Create intersection observer for fade effects
    const fadeOptions = {
        root: null, // use viewport
        rootMargin: '0px',
        threshold: 0.1 // trigger when 10% visible
    };
    
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Add or remove visible class based on intersection
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-visible');
            } else {
                entry.target.classList.remove('scroll-visible');
            }
        });
    }, fadeOptions);
    
    // Observe all major content sections
    const contentSections = document.querySelectorAll('.container > div, .card, section, .row > div');
    contentSections.forEach(section => {
        section.classList.add('scroll-element');
        fadeObserver.observe(section);
    });
}

// Function to validate TTS form
function validateTTSForm() {
    const textInput = document.getElementById('text-input');
    const submitBtn = document.querySelector('#ttsForm button[type="submit"]');
    
    if (!textInput || !submitBtn) return;
    
    // Validate on input
    textInput.addEventListener('input', () => {
        const text = textInput.value.trim();
        const charCount = text.length;
        
        // Update character counter
        const counterEl = document.getElementById('char-counter');
        if (counterEl) {
            counterEl.textContent = `${charCount}/5000`;
            
            // Visual feedback if too long
            if (charCount > 5000) {
                counterEl.classList.add('text-danger');
            } else {
                counterEl.classList.remove('text-danger');
            }
        }
        
        // Disable button if invalid
        submitBtn.disabled = charCount === 0 || charCount > 5000;
    });
    
    // Initial validation
    textInput.dispatchEvent(new Event('input'));
}

// Function to enhance accessibility
function enhanceAccessibility() {
    // Make custom controls keyboard accessible
    const customButtons = document.querySelectorAll('.custom-audio-player button');
    customButtons.forEach(button => {
        if (!button.getAttribute('aria-label')) {
            // Set appropriate labels
            if (button.id === 'playBtn') {
                button.setAttribute('aria-label', 'Play audio');
            } else if (button.id === 'muteBtn') {
                button.setAttribute('aria-label', 'Toggle mute');
            }
        }
        
        // Ensure keyboard focus styles
        button.addEventListener('focus', () => {
            button.classList.add('keyboard-focus');
        });
        
        button.addEventListener('blur', () => {
            button.classList.remove('keyboard-focus');
        });
    });
    
    // Make progress bar accessible
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.setAttribute('role', 'slider');
        progressBar.setAttribute('aria-label', 'Audio progress');
        progressBar.setAttribute('aria-valuemin', '0');
        progressBar.setAttribute('aria-valuemax', '100');
        progressBar.setAttribute('aria-valuenow', '0');
        progressBar.setAttribute('tabindex', '0');
    }
}

// Simple analytics tracking
function trackEvent(category, action, label = null) {
  // Log event
  console.log(`[Analytics] ${category}: ${action}${label ? ' - ' + label : ''}`);
  
  // Could be integrated with Google Analytics, Plausible, etc.
  // Or send to your own backend endpoint
  
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, action, label, timestamp: new Date().toISOString() })
  }).catch(err => console.error('Analytics error:', err));
}

// Replace your initTranslator function with this fixed version

function initTranslator() {
  const translatorToggle = document.getElementById('translator-toggle');
  const translatorDropdown = document.getElementById('translator-dropdown');
  const translatorClose = document.getElementById('translator-close');
  const translatorWidget = document.querySelector('.translator-widget');
  
  if (!translatorToggle || !translatorDropdown || !translatorWidget) return;
  
  // Toggle dropdown
  translatorToggle.addEventListener('click', () => {
    translatorDropdown.classList.toggle('active');
  });
  
  // Close dropdown
  if (translatorClose) {
    translatorClose.addEventListener('click', () => {
      translatorDropdown.classList.remove('active');
    });
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    // Fixed: Now translatorWidget is defined before use
    if (translatorWidget && !translatorWidget.contains(e.target)) {
      translatorDropdown.classList.remove('active');
    }
  });
  
  // Get language buttons
  const langButtons = document.querySelectorAll('.translator-lang-btn');
  
  // Language selection
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      
      // Update active state
      langButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Save preference
      localStorage.setItem('preferredTranslationLanguage', lang);
      
      // Use a simpler approach with Google Translate
      translateWithGoogleApi(lang);
      
      // Close dropdown after selection
      setTimeout(() => {
        translatorDropdown.classList.remove('active');
      }, 500);
    });
  });
  
  // Check for saved language preference
  const savedLang = localStorage.getItem('preferredTranslationLanguage');
  if (savedLang && savedLang !== 'en') {
    // Find and activate the saved language button
    const savedLangBtn = document.querySelector(`.translator-lang-btn[data-lang="${savedLang}"]`);
    if (savedLangBtn) {
      savedLangBtn.classList.add('active');
      // Apply the saved language
      translateWithGoogleApi(savedLang);
    }
  } else {
    // Set English as default active
    const enBtn = document.querySelector('.translator-lang-btn[data-lang="en"]');
    if (enBtn) enBtn.classList.add('active');
  }
}

// Simplified translation function using Google's translation API
function translateWithGoogleApi(lang) {
  // Skip if already English
  if (lang === 'en') {
    // Reset to original
    if (window.location.hash.includes('googtrans')) {
      window.location.hash = '';
      location.reload();
    }
    return;
  }
  
  // Set the URL hash which Google Translate uses
  window.location.hash = `#googtrans(en|${lang})`;
  
  // Load Google Translate script if not already loaded
  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(script);
    
    // Define the callback function
    window.googleTranslateElementInit = function() {
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false,
        includedLanguages: 'en,hu,de,fr,es,it,pl,ru,zh,ja'
      }, 'google_translate_element');
    };
  } else {
    // If script already loaded, refresh the translation
    location.reload();
  }
}

// Add this function to your existing JS file

function initTextTranslator() {
  const translateBtn = document.getElementById('translate-btn');
  const translateFrom = document.getElementById('translate-from');
  const translateTo = document.getElementById('translate-to');
  const textInput = document.getElementById('text-input');
  
  if (!translateBtn || !translateFrom || !translateTo || !textInput) return;
  
  // Store original text when starting translation
  let originalText = '';
  
  // Add click handler for translate button
  translateBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) return;
    
    const fromLang = translateFrom.value;
    const toLang = translateTo.value;
    
    // Store original text
    originalText = text;
    
    // Show loading indicator
    let progressEl = document.querySelector('.translation-progress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.className = 'translation-progress';
      progressEl.innerHTML = '<i class="fas fa-spinner"></i> Translating...';
      textInput.parentNode.appendChild(progressEl);
    }
    progressEl.style.display = 'flex';
    
    try {
      // Call your backend API for translation
      const response = await fetch('/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          source: fromLang,
          target: toLang
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Translation failed');
      }
      
      // Update the text input with the translated text
      textInput.value = result.translatedText;
      
      // Add "Translated from [language]" indicator
      let translatedTextInfo = document.querySelector('.translated-text');
      if (!translatedTextInfo) {
        translatedTextInfo = document.createElement('div');
        translatedTextInfo.className = 'translated-text';
        textInput.parentNode.appendChild(translatedTextInfo);
      }
      
      // Get display name of source language
      const sourceLanguageName = fromLang === 'auto' 
        ? result.detectedSourceLanguage 
        : translateFrom.options[translateFrom.selectedIndex].text;
      
      translatedTextInfo.innerHTML = `
        <div>Translated from ${sourceLanguageName}</div>
        <button class="btn btn-link btn-sm revert-translation">Revert to original</button>
      `;
      
      // Add handler for revert button
      document.querySelector('.revert-translation').addEventListener('click', () => {
        textInput.value = originalText;
        translatedTextInfo.style.display = 'none';
      });
      
      translatedTextInfo.style.display = 'block';
      
    } catch (error) {
      console.error('Translation error:', error);
      alert(`Translation failed: ${error.message || 'Please try again'}`);
    } finally {
      // Hide loading indicator
      progressEl.style.display = 'none';
    }
  });
  
  // Update language dropdown selection when a language is chosen
  translateFrom.addEventListener('change', () => {
    localStorage.setItem('preferredFromLanguage', translateFrom.value);
  });
  
  translateTo.addEventListener('change', () => {
    localStorage.setItem('preferredToLanguage', translateTo.value);
    
    // Also update the TTS language dropdown if it exists
    const ttsLanguage = document.getElementById('language');
    if (ttsLanguage) {
      // Only update if the language is supported in the TTS dropdown
      const langExists = Array.from(ttsLanguage.options).some(option => option.value === translateTo.value);
      if (langExists) {
        ttsLanguage.value = translateTo.value;
      }
    }
  });
  
  // Load saved language preferences
  const savedFromLang = localStorage.getItem('preferredFromLanguage');
  const savedToLang = localStorage.getItem('preferredToLanguage');
  
  if (savedFromLang) translateFrom.value = savedFromLang;
  if (savedToLang) translateTo.value = savedToLang;
}