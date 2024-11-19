FROM python:3.12.4-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir -r requirements.txt
RUN pip check
EXPOSE 8080
ENV FLASK_APP=main.py
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "main:app"]
