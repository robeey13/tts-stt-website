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

def enhance_audio(audio_segment, quality='standard'):
    """
    Apply audio enhancements to improve sound quality
    
    Args:
        audio_segment (AudioSegment): The pydub AudioSegment to enhance
        quality (str): Quality level ('standard' or 'high')
        
    Returns:
        AudioSegment: Enhanced audio
    """
    try:
        # Apply a slight compression to improve clarity
        # This makes quieter parts louder and reduces very loud parts
        if quality == 'high':
            # Strong enhancements for high quality
            # Boost the frequency range most important for speech clarity
            # Typically around 2-4kHz for consonant sounds
            enhanced = audio_segment.high_pass_filter(100).low_pass_filter(10000)
            
            # Slight boost in volume
            enhanced = enhanced + 3  # +3dB boost
            
            # Apply compression for dynamic range
            # This is a simplified approach - in production you might use a more sophisticated method
            attack = 5     # milliseconds
            release = 50   # milliseconds
            threshold = -20  # dB
            ratio = 4.0    # 4:1 compression ratio
            enhanced = enhanced.compress_dynamic_range(threshold=threshold, ratio=ratio, attack=attack, release=release)
        else:
            # Standard enhancements
            # Mild frequency adjustments
            enhanced = audio_segment.high_pass_filter(150).low_pass_filter(8000)
            
            # Small volume boost
            enhanced = enhanced + 1.5  # +1.5dB boost
            
            # Mild compression
            threshold = -15
            ratio = 2.0
            attack = 10
            release = 100
            enhanced = enhanced.compress_dynamic_range(threshold=threshold, ratio=ratio, attack=attack, release=release)
        
        return enhanced
    except Exception as e:
        logger.error(f"Audio enhancement error: {str(e)}")
        # Return original if enhancement fails
        return audio_segment

def text_to_speech(text, language, voice_type='normal', quality='standard'):
    """
    Convert text to speech with speed modification and enhanced quality
    
    Args:
        text (str): The text to convert
        language (str): Language code
        voice_type (str): 'normal', 'slow', 'fast'
        quality (str): Quality setting
    
    Returns:
        str: Path to generated audio file
    """
    try:
        # Validate inputs
        if not text or len(text.strip()) == 0:
            logger.error("Empty text provided")
            return None
            
        # Check for supported languages
        supported_languages = ['en', 'fr', 'es', 'de', 'it', 'hu']
        if language not in supported_languages:
            logger.warning(f"Unsupported language: {language}, falling back to English")
            language = 'en'
        
        # Preprocess the text
        processed_text = preprocess_text(text, language)
        
        # Create a unique ID for this TTS request
        cache_key = f"{hashlib.md5((text + language + voice_type + quality).encode()).hexdigest()}"
        
        # Check cache
        cached_path = _tts_cache.get(cache_key)
        if cached_path and os.path.exists(os.path.join('static', cached_path.lstrip('/'))):
            logger.info(f"Cache hit for {cache_key}")
            return cached_path
        
        # Generate a unique filename
        filename = f"tts_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{str(uuid.uuid4())[:8]}.mp3"
        temp_path = os.path.join('static', 'audio', 'temp_' + filename)
        output_path = os.path.join('static', 'audio', filename)
        
        # Generate speech with gTTS
        use_slow_tts = voice_type == 'slow'
        logger.info(f"Generating speech for text: {processed_text[:50]}... (slow={use_slow_tts})")
        
        tts = gTTS(text=processed_text, lang=language, slow=use_slow_tts)
        tts.save(temp_path)
        
        # Load audio with pydub for enhancement and speed modification
        sound = AudioSegment.from_mp3(temp_path)
        
        # Apply speed modification
        if voice_type == 'fast':
            # Speed up by 30%
            sound_with_altered_frame_rate = sound._spawn(sound.raw_data, overrides={
                "frame_rate": int(sound.frame_rate * 1.3)
            })
            sound = sound_with_altered_frame_rate.set_frame_rate(sound.frame_rate)
        elif voice_type == 'slow' and not use_slow_tts:
            # Additional slow down beyond gTTS slow parameter
            sound_with_altered_frame_rate = sound._spawn(sound.raw_data, overrides={
                "frame_rate": int(sound.frame_rate * 0.9)
            })
            sound = sound_with_altered_frame_rate.set_frame_rate(sound.frame_rate)
        
        # Apply audio enhancements
        sound = enhance_audio(sound, quality)
        
        # Export with appropriate quality settings
        if quality == "high":
            logger.info(f"Applying high quality export settings")
            # High quality export settings
            sound.export(output_path, format="mp3", 
                        bitrate="192k",
                        parameters=["-ar", "44100", "-ac", "2", "-q:a", "0"])
        else:
            # Improved standard quality settings
            logger.info(f"Applying standard quality export settings")
            sound.export(output_path, format="mp3", 
                        bitrate="128k",
                        parameters=["-ar", "32000", "-ac", "1", "-q:a", "2"])
        
        # Remove the temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
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
    result = text_to_speech(test_text, language="en", voice_type="normal", quality="high")
    print(f"Generated audio file: {result}")