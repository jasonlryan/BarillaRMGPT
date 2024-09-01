from dotenv import load_dotenv
import os
import openai
from openai import OpenAI
from flask import Flask, render_template, request, Response, stream_with_context, jsonify
import json
import logging
import time

# Load environment variables
load_dotenv()

# Get API key, assistant ID, and project ID
api_key = os.getenv("OPENAI_API_KEY")
assistant_id = os.getenv("OPENAI_ASSISTANT_ID")
project_id = os.getenv("OPENAI_PROJECT_ID")

# Set up OpenAI client
client = OpenAI(api_key=api_key, project=project_id)

# Create Flask app
app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

def generate_response(user_message):
    try:
        thread = client.beta.threads.create()
        app.logger.info(f"Created thread: {thread.id}")

        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=user_message
        )
        app.logger.info(f"Added user message to thread")

        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id
        )
        app.logger.info(f"Started run: {run.id}")

        while run.status not in ["completed", "failed"]:
            time.sleep(1)
            run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
            app.logger.info(f"Run status: {run.status}")

        if run.status == "failed":
            app.logger.error(f"Run failed: {run.last_error}")
            return "I'm sorry, I encountered an error while processing your request."

        messages = client.beta.threads.messages.list(thread_id=thread.id)
        assistant_message = next((msg for msg in messages if msg.role == "assistant"), None)
        
        if assistant_message:
            app.logger.info("Retrieved assistant message")
            return assistant_message.content[0].text.value
        else:
            app.logger.warning("No assistant message found")
            return "I'm sorry, I couldn't generate a response."

    except Exception as e:
        app.logger.error(f"Error generating response: {str(e)}")
        return "I'm sorry, I couldn't process your request."

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
                                print(token, end='', flush=True)  # Print token to terminal
                                yield f"data: {json.dumps({'token': token, 'full_response': full_response})}\n\n"
                elif event_type == "RunCompleted":
                    print()  # Print newline after completion
                    break

        except Exception as e:
            print(f"\nError: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/test')
def test():
    return "Server is running"

if __name__ == "__main__":
    app.run(debug=True)