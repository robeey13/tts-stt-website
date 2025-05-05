# Text-to-Speech Web Application

This project is a web application that provides text-to-speech functionality. Users can input text, and the application will convert it into speech using a Python script.

## Project Structure

```
text-to-speech-web
├── static
│   ├── css
│   │   └── style.css
│   └── js
│       └── main.js
├── templates
│   └── index.html
├── python
│   └── tts_script.py
├── app.py
├── requirements.txt
└── README.md
```

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd text-to-speech-web
   ```

2. **Install dependencies**:
   Make sure you have Python installed. Then, create a virtual environment and install the required packages:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install -r requirements.txt
   ```

3. **Run the application**:
   Start the web server by running:
   ```
   python app.py
   ```

4. **Access the application**:
   Open your web browser and go to `http://127.0.0.1:5000` to use the text-to-speech functionality.

## Usage

- Enter the text you want to convert to speech in the provided input field.
- Click the "Convert" button to hear the speech output.

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements for the project.

## License

This project is licensed under the MIT License. See the LICENSE file for details.