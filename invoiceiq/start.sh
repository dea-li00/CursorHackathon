#!/bin/bash

# InvoiceIQ Startup Script

echo "🚀 Starting InvoiceIQ..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your API keys (optional)"
fi

# Create necessary directories
mkdir -p uploads exports data/fixtures

echo "🐳 Starting with Docker Compose..."
docker-compose up --build

echo "✅ InvoiceIQ is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
