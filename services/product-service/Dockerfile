FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3002/health')" || exit 1
CMD ["gunicorn","--bind","0.0.0.0:3002","--workers","2","--timeout","60","app:app"]
