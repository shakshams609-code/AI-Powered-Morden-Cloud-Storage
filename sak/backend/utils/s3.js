const fs = require('fs');
const path = require('path');
const url = require('url');

const AWS_BUCKET = process.env.AWS_S3_BUCKET;

let S3Client, PutObjectCommand, GetObjectCommand, getSignedUrl;
if (AWS_BUCKET) {
  // lazy-require AWS SDK pieces only when configured
  ({ S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3'));
  ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
}

const ensureUploadsDir = (dir) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
};

const uploadToS3 = async (buffer, key, contentType) => {
  if (AWS_BUCKET) {
    const client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private'
    });

    await client.send(command);
    return { key, url: `https://${AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}` };
  }

  // Local fallback: write file under backend/uploads/<key>
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  ensureUploadsDir(uploadsDir);
  const filePath = path.join(uploadsDir, key);
  // ensure subdirectories exist
  ensureUploadsDir(path.dirname(filePath));
  await fs.promises.writeFile(filePath, buffer);

  const port = process.env.PORT || 4000;
  const host = process.env.LOCAL_HOST || `http://localhost:${port}`;
  return { key, url: `${host}/uploads/${encodeURIComponent(key)}` };
};

const generatePresignedUrl = async (objectUrl) => {
  if (AWS_BUCKET) {
    const parsed = url.parse(objectUrl);
    const key = parsed.pathname.slice(1);
    const client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
    const command = new GetObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key
    });

    return getSignedUrl(client, command, { expiresIn: 3600 });
  }

  // Local files are publicly served under /uploads, return the direct URL
  return objectUrl;
};

module.exports = { uploadToS3, generatePresignedUrl };
