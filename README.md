# Background Removal API

A Node.js API service that removes backgrounds from images using the Remove.bg API.

## Features

- 🖼️ Remove background from images (JPEG, PNG, WebP)
- 🔒 File validation and security
- 🚀 CORS support for cross-origin requests
- 📊 Health check endpoint
- 🛡️ Comprehensive error handling
- 📝 Detailed logging
- ⚡ Production optimizations

## Prerequisites

- Node.js 16+ 
- Remove.bg API key ([Get one here](https://www.remove.bg/api))

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd be
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Edit `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development
REMOVE_BG_API_KEY=your_remove_bg_api_key_here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Usage

### Development
```bash
npm run dev
# or
yarn dev
```

### Production
```bash
NODE_ENV=production npm start
# or
NODE_ENV=production yarn start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Environment Modes

### Development Mode (`NODE_ENV=development`)
- **File size limit**: 10MB
- **Error messages**: Detailed error information exposed
- **Logging**: Verbose logging with emojis and details
- **Security**: Basic security headers
- **API timeout**: 30 seconds
- **Health check**: Includes memory usage

### Production Mode (`NODE_ENV=production`)
- **File size limit**: 5MB (stricter for security)
- **Error messages**: Generic error messages (no sensitive info)
- **Logging**: Structured logging with IP, user agent, processing time
- **Security**: Enhanced security headers (HSTS, XSS protection, etc.)
- **API timeout**: 45 seconds (longer for reliability)
- **Health check**: No memory usage exposed
- **Trust proxy**: Enabled for reverse proxy support

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and information.

**Development response:**
```json
{
  "status": "OK",
  "message": "Background removal API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "uptime": 123.456,
  "memory": { "rss": 123456, "heapTotal": 123456, "heapUsed": 123456 }
}
```

**Production response:**
```json
{
  "status": "OK",
  "message": "Background removal API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "uptime": 123.456
}
```

### Remove Background
```
POST /api/remove
```
Removes background from uploaded image.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `image` field containing the image file

**Supported formats:** JPEG, PNG, WebP
**Max file size:** 5MB (production) / 10MB (development)

**Response:**
- Content-Type: `image/png`
- Body: PNG image with transparent background
- Headers: `X-Processing-Time` (production only)

**Example using curl:**
```bash
curl -X POST \
  -F "image=@/path/to/your/image.jpg" \
  http://localhost:3000/api/remove \
  --output removed-bg.png
```

**Example using JavaScript:**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch('http://localhost:3000/api/remove', {
  method: 'POST',
  body: formData
})
.then(response => response.blob())
.then(blob => {
  // Handle the processed image
  const url = URL.createObjectURL(blob);
  // Display or download the image
});
```

### API Information
```
GET /api/remove
```
Returns API documentation and usage information.

**Development response includes examples, production response is minimal.**

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400` - Bad Request (invalid file, file too large, etc.)
- `401` - Unauthorized (invalid API key)
- `402` - Payment Required (API quota exceeded)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

**Development mode** shows detailed error messages, **production mode** shows generic messages.

## Deployment

### Heroku
1. Create a new Heroku app
2. Set environment variables in Heroku dashboard:
   - `REMOVE_BG_API_KEY`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS` (your frontend domain)
3. Deploy using Heroku CLI or GitHub integration

### Railway
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard:
   - `REMOVE_BG_API_KEY`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS`
3. Deploy automatically

### Vercel
1. Import your repository
2. Set environment variables in Vercel dashboard:
   - `REMOVE_BG_API_KEY`
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS`
3. Deploy

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `REMOVE_BG_API_KEY` | Remove.bg API key | - | **Yes** |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` | No |

## Security Considerations

- File size is limited to 5MB (production) / 10MB (development)
- Only image files (JPEG, PNG, WebP) are accepted
- CORS is configured to prevent unauthorized access
- Uploaded files are automatically cleaned up after processing
- API key is validated before making requests
- Production mode includes enhanced security headers
- Detailed error messages are hidden in production

## Performance Optimizations

### Production Mode Features:
- **Structured logging** for better monitoring
- **Processing time tracking** with `X-Processing-Time` header
- **Longer API timeouts** for reliability
- **Trust proxy support** for reverse proxy deployments
- **Memory usage hidden** from health checks
- **Stricter file size limits** for security

## Troubleshooting

### Common Issues

1. **"REMOVE_BG_API_KEY environment variable is not set"**
   - Make sure you've set the API key in your `.env` file
   - Verify the variable name is correct

2. **"API quota exceeded"**
   - Check your Remove.bg account for remaining credits
   - Consider upgrading your plan

3. **"Invalid file type"**
   - Ensure you're uploading JPEG, PNG, or WebP files
   - Check file extension and MIME type

4. **"File too large"**
   - Development: max 10MB
   - Production: max 5MB
   - Compress your image or use a smaller file

5. **CORS errors**
   - Configure `ALLOWED_ORIGINS` in your `.env` file
   - Make sure your frontend domain is included

6. **Production deployment issues**
   - Ensure `NODE_ENV=production` is set
   - Check that all environment variables are configured
   - Verify CORS settings for your domain

## License

ISC 