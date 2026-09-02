# Sovereign Audio Protocol — forensic separation worker.
#
# Self-contained: model weights are baked in at build time so the running
# container needs no outbound network access. Runs on GPU when one is passed
# through (NVIDIA T4 / A10G), and falls back to CPU without a code change.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TORCH_HOME=/opt/torch \
    DEMUCS_MODEL=htdemucs

# ffmpeg backs librosa/audioread for mp3 and the less common aiff variants.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg libsndfile1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Warm the weights into the image; after this the worker never fetches anything.
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

COPY app.py separation.py measurements.py ./

EXPOSE 8770

# One worker process: separation is serialised on the GPU anyway, and a second
# process would just double the VRAM footprint for no throughput.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8770", "--workers", "1"]
