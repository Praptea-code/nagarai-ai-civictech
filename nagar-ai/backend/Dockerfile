FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# ML models (~4GB total) download into a mounted cache volume on first boot so
# no request ever waits on a model download. See prefetch_models.py.
ENTRYPOINT ["python", "prefetch_models.py"]

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
