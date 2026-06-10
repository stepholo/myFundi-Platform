FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# requirements file lives at project root (one level above efundi_app/)
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir \
    django-environ \
    psycopg2-binary \
    gunicorn \
    drf-spectacular \
    -r /tmp/requirements.txt

# copy the Django project
COPY efundi_app/ .

EXPOSE 8000

CMD ["gunicorn", "efundi_app.wsgi:application", "--bind", "0.0.0.0:8000"]
