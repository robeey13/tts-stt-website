import speech_recognition as sr
import os
import uuid
import tempfile
import logging
from pydub import AudioSegment

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("stt.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("stt")

def recognize_speech_from_audio(audio_file, language='en'):
    """
    Recognize speech from an audio file and return the text
    
    Args:
        audio_file: File object from request.files
        language: Language code ('en', 'hu', etc.)
        
    Returns:
        str: Recognized text or error message
    """
    recognizer = sr.Recognizer()
    
    # Create temporary files
    temp_dir = tempfile.gettempdir()
    temp_input = os.path.join(temp_dir, f"upload_{uuid.uuid4().hex}")
    temp_wav = os.path.join(temp_dir, f"converted_{uuid.uuid4().hex}.wav")
    
    try:
        # Save the uploaded file
        if hasattr(audio_file, 'save'):
            audio_file.save(temp_input)
            input_path = temp_input
        else:
            input_path = audio_file
            
        logger.info(f"Audio file saved: {input_path}")
        
        # Convert to WAV format (16kHz, mono, PCM)
        try:
            audio = AudioSegment.from_file(input_path)
            audio = audio.set_channels(1)  # Convert to mono
            audio = audio.set_frame_rate(16000)  # Convert to 16kHz
            audio.export(temp_wav, format="wav")  # Export as WAV
            logger.info(f"Converted to WAV: {temp_wav}")
        except Exception as e:
            logger.error(f"Error converting audio: {str(e)}")
            return f"Error converting audio: {str(e)}"
        
        # Recognize speech from the converted WAV file
        with sr.AudioFile(temp_wav) as source:
            audio_data = recognizer.record(source)
            
            # Convert speech to text
            logger.info(f"Recognizing speech with language: {language}")
            text = recognizer.recognize_google(audio_data, language=language)
            logger.info(f"Speech recognized: {text[:50]}...")
            return text
            
    except sr.UnknownValueError:
        logger.warning("Could not understand audio")
        return "Could not understand audio"
    except sr.RequestError as e:
        logger.error(f"RequestError from Google API: {str(e)}")
        return "Could not request results from speech recognition service"
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        return f"Error processing audio: {str(e)}"
    finally:
        # Clean up temporary files
        for file in [temp_input, temp_wav]:
            if os.path.exists(file):
                try:
                    os.remove(file)
                    logger.debug(f"Removed temporary file: {file}")
                except:
                    pass