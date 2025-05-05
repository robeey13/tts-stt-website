# Python Text-to-Speech Module

from gtts import gTTS
import os
import datetime
import uuid
import hashlib
import logging
from pydub import AudioSegment
import functools
from collections import OrderedDict

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("tts.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("tts")

# LRU Cache for audio files
class TTSCache:
    def __init__(self, max_size=100):
        self.cache = OrderedDict()
        self.max_size = max_size
        
    def get(self, key):
        if key in self.cache:
            # Move to end (most recently used)
            value = self.cache.pop(key)
            self.cache[key] = value
            return value
        return None
        
    def set(self, key, value):
        if key in self.cache:
            # Remove existing item
            self.cache.pop(key)
        elif len(self.cache) >= self.max_size:
            # Remove oldest item
            self.cache.popitem(last=False)
        # Add new item
        self.cache[key] = value

# Create cache instance
_tts_cache = TTSCache(max_size=200)

# Update your preprocess_text function
def preprocess_text(text, language='en'):
    """Preprocess text for better speech synthesis"""
    # Base preprocessing
    abbreviations = {
        'e.g.': 'for example',
        'i.e.': 'that is',
        'etc.': 'etcetera',
        'vs.': 'versus',
        'Dr.': 'Doctor',
        'Mr.': 'Mister',
        'Mrs.': 'Misses',
        'Prof.': 'Professor'
    }
    for abbr, full in abbreviations.items():
        text = text.replace(abbr, full)
    
    # Language-specific preprocessing
    if language == 'hu':
        # Hungarian abbreviations
        hu_abbreviations = {
            'pl.': 'például',
            'kb.': 'körülbelül',
            'dr.': 'doktor',
            'stb.': 'satöbbi'
        }
        for abbr, full in hu_abbreviations.items():
            text = text.replace(abbr, full)
    
    return text

def text_to_speech(text, language, sample_rate=16000, voice='default', quality='standard'):
    """Convert text to speech with proper language support"""
    logger.info(f"TTS request: language={language}, quality={quality}, voice={voice}, sample_rate={sample_rate}")
    
    """
    Convert text to speech
    
    Args:
        text (str): The text to convert
        language (str): The language code
        sample_rate (int): Audio sample rate
        voice (str): Voice name to use
        quality (str): Quality setting
        
    Returns:
        str: Path to the generated audio file
    """
    try:
        # Validate inputs
        if not text or len(text.strip()) == 0:
            logger.error("Empty text provided")
            return None
            
        # Check for supported languages
        supported_languages = ['en', 'fr', 'es', 'de', 'it', 'hu']  # Add 'hu' for Hungarian
        if language not in supported_languages:
            logger.warning(f"Unsupported language: {language}, falling back to English")
            language = 'en'
        
        # Preprocess the text
        processed_text = preprocess_text(text, language)
        
        # Create a unique ID for this TTS request
        cache_key = f"{hashlib.md5((text + language + voice + quality).encode()).hexdigest()}"
        
        # Check cache
        cached_path = _tts_cache.get(cache_key)
        if cached_path and os.path.exists(os.path.join('static', cached_path.lstrip('/'))):
            logger.info(f"Cache hit for {cache_key}")
            return cached_path
        
        # Generate a unique filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"tts_{timestamp}_{unique_id}.mp3"
        output_path = os.path.join('static', 'audio', filename)
        
        # Use gTTS to generate speech
        logger.info(f"Generating speech for text: {processed_text[:50]}...")
        tts = gTTS(text=processed_text, lang=language, slow=False)  # Ensure correct language parameter
        tts.save(output_path)
        
        # Apply quality settings using pydub if high quality requested
        if quality == "high":
            logger.info(f"Applying high quality settings with sample rate {sample_rate}")
            audio = AudioSegment.from_mp3(output_path)
            # Export with higher bitrate for better quality
            audio.export(output_path, format="mp3", bitrate="192k")
        
        # Store in cache and return the web-accessible path
        relative_path = f"/static/audio/{filename}"
        _tts_cache.set(cache_key, relative_path)
        
        logger.info(f"Successfully generated audio at {relative_path}")
        return relative_path
        
    except Exception as e:
        logger.error(f"TTS generation error: {str(e)}")
        # Capture stack trace for debugging
        import traceback
        logger.error(traceback.format_exc())
        return None

# For testing
if __name__ == "__main__":
    test_text = "This is a test of the text to speech system."
    result = text_to_speech(test_text, language="en", quality="high")
    print(f"Generated audio file: {result}")