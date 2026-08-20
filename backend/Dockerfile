FROM python:3.12-slim

# Set work directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . ./

ENV PYTHONPATH=/app/backend:/app:.
ENV SKIP_AUTO_BUILD=1

# Expose port
EXPOSE 8000

# Command to run the app
CMD ["python", "main.py"]