from flask import Flask, render_template, request, jsonify
import os
import logging
import re
import html
import time
from python.tts_script import text_to_speech
from python.stt_script import recognize_speech_from_audio
# Replace the original import
# from googletrans import Translator

# With this import instead
from deep_translator import GoogleTranslator

# Make sure you have requests installed (pip install requests)
import requests

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("app")

app = Flask(__name__)

# Ensure directories exist
os.makedirs(os.path.join('static', 'audio'), exist_ok=True)

# Simple in-memory storage for rate limiting
_request_counters = {}

def request_count_exceeds_limit(request_key, limit=10, window=60):
    """
    Check if a request exceeds the rate limit
    
    Args:
        request_key: Unique identifier for the request (usually IP-based)
        limit: Maximum number of requests allowed in the time window
        window: Time window in seconds
    
    Returns:
        bool: True if limit exceeded, False otherwise
    """
    current_time = time.time()
    
    # Initialize or clean up expired entries
    if request_key not in _request_counters:
        _request_counters[request_key] = []
    
    # Remove timestamps outside the current window
    _request_counters[request_key] = [
        timestamp for timestamp in _request_counters[request_key] 
        if current_time - timestamp < window
    ]
    
    # Check if limit exceeded
    if len(_request_counters[request_key]) >= limit:
        return True
    
    # Add current timestamp and return False (not exceeded)
    _request_counters[request_key].append(current_time)
    return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/features')
def features():
    return render_template('features.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/speak', methods=['POST'])
def speak():
    """Convert text to speech and return the audio file path"""
    try:
        # Get and sanitize inputs
        text = request.form.get('text', '')
        text = html.escape(text)  # Prevent XSS
        
        # Validate text length
        if len(text) > 5000:  # Set reasonable limit
            logger.warning(f"Text too long: {len(text)} chars")
            return "Text exceeds maximum length (5000 characters)", 400
            
        # Rate limiting (simple implementation)
        client_ip = request.remote_addr
        current_time = time.time()
        request_key = f"{client_ip}:tts_request"
        
        # Check rate limit
        if request_count_exceeds_limit(request_key):
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return "Too many requests, please try again later", 429
            
        # Rest of your code...
        voice = request.form.get('voice', 'default')
        quality = request.form.get('quality', 'standard')
        
        print(f"Received quality parameter: {quality}")  # Debug output
        
        # Example with different TTS libraries:
        if quality == "high":
            # Set higher sample rate, bitrate, etc.
            sample_rate = 24000  # or 44100 for even higher
        else:
            sample_rate = 16000  # standard quality
        
        language = request.form.get('language', 'en')
        
        if not text:
            logger.warning("Empty text received in /speak endpoint")
            return "No text provided", 400
        
        logger.info(f"Converting text to speech: language={language}, text_length={len(text)}, voice={voice}, quality={quality}")
        audio_path = text_to_speech(text, language, sample_rate=sample_rate, voice=voice, quality=quality)
        
        if not audio_path:
            logger.error("Failed to generate audio")
            return "Failed to generate audio", 500
        
        # Return the relative URL path for the frontend
        return audio_path
    
    except Exception as e:
        logger.exception("Error in /speak endpoint")
        return str(e), 500

@app.route('/recognize', methods=['POST'])
def recognize():
    """Convert speech to text and return the transcription"""
    try:
        if 'audio' not in request.files:
            logger.warning("No audio file in request")
            return jsonify({'error': 'No audio file uploaded'}), 400
        
        audio_file = request.files['audio']
        language = request.form.get('language', 'en')
        
        if audio_file.filename == '':
            logger.warning("Empty audio filename")
            return jsonify({'error': 'No audio file selected'}), 400
        
        logger.info(f"Recognizing speech: language={language}, file={audio_file.filename}")
        text = recognize_speech_from_audio(audio_file, language)
        
        if text.startswith("Error"):
            logger.error(f"Recognition error: {text}")
            return jsonify({'error': text}), 400
        
        return jsonify({'text': text})
    
    except Exception as e:
        logger.exception("Error in /recognize endpoint")
        return jsonify({'error': str(e)}), 500

@app.route('/translate', methods=['POST'])
def translate_text():
    """Translate text between languages using Google Translate API"""
    try:
        data = request.json
        text = data.get('text', '')
        source_lang = data.get('source', 'auto')
        target_lang = data.get('target', 'en')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        # Use requests to call Google Translate API
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": source_lang,
            "tl": target_lang,
            "dt": "t",
            "q": text
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            raise Exception(f"API returned status code {response.status_code}")
            
        # Parse response
        result = response.json()
        translated_text = ""
        
        # Extract translated text from nested arrays
        for sentence in result[0]:
            if sentence[0]:
                translated_text += sentence[0]
                
        # Get detected source language
        detected_source_lang = result[2] if len(result) > 2 else source_lang
        
        return jsonify({
            "translatedText": translated_text,
            "detectedSourceLanguage": detected_source_lang
        })
        
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return jsonify({"error": f"Translation failed: {str(e)}"}), 500

@app.errorhandler(404)
def page_not_found(e):
    logger.warning(f"404 error: {request.path}")
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    logger.error(f"500 error: {str(e)}")
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(debug=True)