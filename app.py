import os
from dotenv import load_dotenv
from openai import OpenAI
from flask import Flask, render_template, request, Response, stream_with_context, jsonify
import json
import time

# Force reload of environment variables
load_dotenv(override=True)

# Get API key, assistant ID, and project ID
api_key = os.getenv("OPENAI_API_KEY")
assistant_id = os.getenv("OPENAI_ASSISTANT_ID")
project_id = os.getenv("OPENAI_PROJECT_ID")

# Set up OpenAI client
client = OpenAI(api_key=api_key, project=project_id)

# Create Flask app
app = Flask(__name__)

@app.route('/')
def home():
    """Render the home page."""
    return render_template('chat.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json['message']

    def generate():
        try:
            thread = client.beta.threads.create()
            client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content=user_message
            )
            run = client.beta.threads.runs.create(
                thread_id=thread.id,
                assistant_id=assistant_id,
                stream=True
            )
            
            full_response = ""
            for event in run:
                event_type = event.__class__.__name__
                if event_type == "ThreadMessageDelta":
                    if hasattr(event.data, 'delta') and hasattr(event.data.delta, 'content'):
                        for content_delta in event.data.delta.content:
                            if content_delta.type == 'text':
                                token = content_delta.text.value
                                full_response += token
                                yield f"data: {json.dumps({'token': token, 'full_response': full_response})}\n\n"
                elif event_type == "RunCompleted":
                    break

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/test')
def test():
    return "Server is running"

if __name__ == "__main__":
    app.run(debug=True)