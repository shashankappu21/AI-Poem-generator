import google.generativeai as genai
from flask import Flask
from transformers import pipeline
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import time

# Configure the API key
genai.configure(api_key='your api key')

model = genai.GenerativeModel("gemini-1.5-flash")

emotion_analysis = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", return_all_scores=True)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://192.168.1.*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# def get_non_overlapping_text(poem, new_chunk):
#     """
#     Function to get the non-overlapping text from the new_chunk.
#     This is done by finding the last occurrence of the new_chunk in the poem
#     and returning the part of new_chunk that does not overlap with the poem.
#     """
#     overlap_index = poem.find(new_chunk.strip())
#     if overlap_index == -1:
#         return new_chunk
#     return new_chunk.strip()[len(poem[overlap_index:].strip()):]

@socketio.on('send_prompt')
def handle_message(data):
    prompt = data.get('prompt')
    userEmotions = data.get('emotionVector')

    # Create a string representation of the user's emotions
    emotion_str = ", ".join([f"{emotion}: {score}" for emotion, score in zip(
        ["joy", "sadness", "neutral", "disgust", "fear", "anger", "surprise"], userEmotions)])

    # Construct the full prompt
    full_prompt = f"Generate a poem using the following prompt: '{prompt}'. Consider the user's current emotional state: {emotion_str}. The poem should subtly reflect or respond to these emotions based on this model: j-hartmann/emotion-english-distilroberta-base."

    stream = model.generate_content(full_prompt, stream=True)
    
    poem = ""
    for response in stream:
        poem_chunk = response.text
        
        # Get non-overlapping text
        # non_overlapping_chunk = get_non_overlapping_text(poem, poem_chunk)
        # poem += non_overlapping_chunk
        poem = poem + poem_chunk
        # print(poem_chunk+"********")
        
        # Analyze emotions for the entire non-overlapping chunk
        if poem_chunk.strip():  # Only analyze if there is something new
            chunk_emotions = emotion_analysis(poem_chunk)[0]
            top_3_chunk_emotions = sorted(chunk_emotions, key=lambda x: x['score'], reverse=True)[:3]
            chunk_emotion_data = {item['label']: item['score'] for item in top_3_chunk_emotions}

            # Split the non-overlapping chunk into lines and analyze emotions line by line
            lines = poem_chunk.split('\n')
            line_emotions = []
            for line in lines:
                if line.strip():  # Ignore empty lines
                    emotions = emotion_analysis(line)[0]
                    top_3_line_emotions = sorted(emotions, key=lambda x: x['score'], reverse=True)[:3]
                    line_emotion_data = {item['label']: item['score'] for item in top_3_line_emotions}
                    line_emotions.append(line_emotion_data)
                else:
                    line_emotions.append({})  # Add empty emotion data for empty lines

            # Emit the data back to the client
            emit('receive_poem_stream', {
                'poem_chunk': poem_chunk,
                'emotions': chunk_emotion_data,
                'line_emotions': line_emotions
            })

        # Sleep to simulate streaming effect
        time.sleep(0.05)
    
    # print(poem)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
