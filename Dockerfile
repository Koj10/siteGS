FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=6100

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 6100

CMD ["gunicorn", "--bind", "0.0.0.0:6100", "--workers", "2", "--threads", "4", "server:app"]
