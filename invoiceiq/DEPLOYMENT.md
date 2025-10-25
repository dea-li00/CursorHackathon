# InvoiceIQ Deployment Guide

## Quick Start (Docker - Recommended)

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd invoiceiq
   cp .env.example .env
   ```

2. **Start the application**:
   ```bash
   ./start.sh
   # OR
   docker-compose up --build
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Local Development Setup

### Backend Setup

1. **Install Python dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp ../.env.example .env
   # Edit .env with your API keys (optional)
   ```

3. **Start the backend**:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. **Install Node.js dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start the frontend**:
   ```bash
   npm run dev
   ```

## API Key Configuration (Optional)

### Azure Document Intelligence

1. Create an Azure account and Document Intelligence resource
2. Get your endpoint and key from the Azure portal
3. Add to `.env`:
   ```env
   AZURE_DI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
   AZURE_DI_KEY=your-key-here
   ```

### OpenAI API

1. Get an API key from https://platform.openai.com/
2. Add to `.env`:
   ```env
   OPENAI_API_KEY=your-key-here
   ```

**Note**: The system works without these API keys using OCR fallback, but accuracy will be lower.

## Testing the Installation

Run the installation test:

```bash
python test_installation.py
```

## Running Tests

### Backend Tests

```bash
cd backend
pip install pytest pytest-asyncio
pytest tests/ -v
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Production Deployment

### Docker Production

1. **Create production environment file**:
   ```bash
   cp .env.example .env.prod
   # Edit with production values
   ```

2. **Build and deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Manual Production Setup

1. **Backend**:
   - Use a production WSGI server (Gunicorn)
   - Set up PostgreSQL database
   - Configure reverse proxy (Nginx)
   - Set up SSL certificates

2. **Frontend**:
   - Build production bundle: `npm run build`
   - Serve with a web server (Nginx)

## Troubleshooting

### Common Issues

1. **Tesseract not found**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install tesseract-ocr
   
   # macOS
   brew install tesseract
   
   # Windows
   # Download from: https://github.com/UB-Mannheim/tesseract/wiki
   ```

2. **Port already in use**:
   - Change ports in docker-compose.yml
   - Or kill existing processes using the ports

3. **Permission denied on start.sh**:
   ```bash
   chmod +x start.sh
   ```

4. **Docker build fails**:
   - Check Docker is running
   - Try: `docker-compose build --no-cache`

### Debug Mode

Set environment variable for detailed logging:

```bash
export DEBUG=true
```

## Performance Tuning

### For High Volume

1. **Use Redis for caching**:
   - Add Redis service to docker-compose.yml
   - Configure caching in backend

2. **Database optimization**:
   - Use PostgreSQL instead of SQLite
   - Add database indexes
   - Configure connection pooling

3. **File storage**:
   - Use cloud storage (S3, Azure Blob)
   - Implement file cleanup policies

## Security Considerations

1. **API Keys**:
   - Never commit API keys to version control
   - Use environment variables or secret management
   - Rotate keys regularly

2. **File Uploads**:
   - Validate file types and sizes
   - Scan for malware
   - Implement rate limiting

3. **Data Protection**:
   - Encrypt sensitive data at rest
   - Use HTTPS in production
   - Implement access controls

## Monitoring

### Health Checks

- Backend: `GET /api/health`
- Frontend: Check if accessible

### Logging

- Backend logs: Check Docker logs
- Frontend logs: Browser developer tools

### Metrics

- Track extraction success rates
- Monitor processing times
- Alert on high error rates

## Backup and Recovery

1. **Database backup**:
   ```bash
   # SQLite
   cp invoiceiq.db invoiceiq.db.backup
   
   # PostgreSQL
   pg_dump invoiceiq > backup.sql
   ```

2. **File backup**:
   - Backup uploads/ directory
   - Backup exports/ directory

3. **Configuration backup**:
   - Backup .env files
   - Document custom configurations

## Scaling

### Horizontal Scaling

1. **Load Balancer**: Use Nginx or cloud load balancer
2. **Multiple Backend Instances**: Scale backend containers
3. **Database Clustering**: Use managed database service

### Vertical Scaling

1. **Increase Resources**: More CPU/RAM for containers
2. **Optimize Code**: Profile and optimize bottlenecks
3. **Caching**: Implement Redis caching layer

## Support

For issues and questions:
1. Check this deployment guide
2. Review API documentation at `/docs`
3. Check GitHub issues
4. Contact support team
