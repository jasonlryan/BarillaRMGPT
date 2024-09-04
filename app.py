import os
from dotenv import load_dotenv
from openai import OpenAI
from flask import Flask, render_template, request, Response, stream_with_context, jsonify
import json
import time
import traceback

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
    try:
        user_message = request.json['message']
        thread_id = request.json.get('thread_id')

        def generate():
            try:
                if not thread_id:
                    thread = client.beta.threads.create()
                    thread_id = thread.id
                    yield f"data: {json.dumps({'thread_id': thread_id})}\n\n"
                
                client.beta.threads.messages.create(
                    thread_id=thread_id,
                    role="user",
                    content=user_message
                )
                run = client.beta.threads.runs.create(
                    thread_id=thread_id,
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
                                    token = content_delta.text.value or ''  # Use empty string if None
                                    full_response += token
                                    print(f"Sending token: {token}")
                                    yield f"data: {json.dumps({'token': token, 'full_response': full_response})}\n\n"
                                elif content_delta.type == 'image_file':
                                    # ... existing image handling code ...
                                    pass
                    elif event_type == "RunCompleted":
                        break

            except Exception as e:
                print(f"Error: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return Response(stream_with_context(generate()), mimetype='text/event-stream')

    except Exception as e:
        error_message = str(e)
        stack_trace = traceback.format_exc()
        print(f"Error: {error_message}\n{stack_trace}")  # This will appear in Vercel logs
        return jsonify({"error": "An error occurred. Please check server logs for details."}), 500

@app.route('/test')
def test():
    return "Server is running"

if __name__ == "__main__":
    app.run(debug=True)