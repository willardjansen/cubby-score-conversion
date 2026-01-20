FROM python:3.11-slim

# Install system dependencies for pdf2image and Audiveris
RUN apt-get update && apt-get install -y \
    poppler-utils \
    default-jre \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# TODO: Download and install Audiveris
# RUN wget https://github.com/Audiveris/audiveris/releases/download/5.3.1/Audiveris-5.3.1.tar.gz
# RUN tar -xzf Audiveris-5.3.1.tar.gz

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
