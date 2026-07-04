FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and InsightFace
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user (Hugging Face Spaces requires this for security)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy all files to the container
COPY --chown=user . $HOME/app

# Hugging Face Spaces exposes port 7860 by default
EXPOSE 7860

# Run the FastAPI app on port 7860
CMD ["uvicorn", "face_api:app", "--host", "0.0.0.0", "--port", "7860"]
