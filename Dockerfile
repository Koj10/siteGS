FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn && \
    find . -name "__pycache__" -exec rm -rf {} + && \
    find . -name "*.pyc" -delete

COPY . .

RUN find . -name "__pycache__" -exec rm -rf {} + \
    && find . -name "*.pyc" -delete

ENV CONTAINER_PORT=8100
ENV GS_API_BASE=http://77.91.100.153:6001

CMD ["gunicorn", "--config", "gunicorn.conf.py", "server:app"]