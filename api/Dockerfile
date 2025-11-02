FROM python:3.13-slim

WORKDIR /app

# Install system dependencies for SQL Server ODBC Driver
RUN apt-get update && apt-get install -y \
    curl \
    apt-transport-https \
    gnupg2 \
    unixodbc-dev \
    unixodbc \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Add Microsoft repository and install ODBC Driver 17 for SQL Server (modern method)
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql17 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

#CMD ["gunicorn", "--bind", "0.0.0.0:5000", "api-postgres:app"]
CMD ["gunicorn", "--config", "gunicorn.conf.py", "api-mssql:app"]
