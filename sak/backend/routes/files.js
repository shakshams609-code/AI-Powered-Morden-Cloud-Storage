const express = require('express');
const crypto = require('crypto');
const File = require('../models/File');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { uploadToS3, generatePresignedUrl } = require('../utils/s3');
const { generateAssistantInsight, extractContentFromUpload, answerQuestion } = require('../utils/aiAssistant');

const router = express.Router();

router.get('/public', async (req, res, next) => {
  try {
    const files = await File.find({ visibility: 'public' }).sort({ updatedAt: -1 }).limit(20);
    res.json(files);
  } catch (error) {
    next(error);
  }
});

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { q, folder } = req.query;
    const filter = { owner: req.user.id };
    if (q) filter.name = { $regex: q, $options: 'i' };
    if (folder) filter.folder = folder;

    const files = await File.find(filter).sort({ updatedAt: -1 });
    res.json(files);
  } catch (error) {
    next(error);
  }
});

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { folder = '/', label = '', visibility = 'private' } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const key = `uploads/${req.user.id}/${Date.now()}_${file.originalname}`;
    const s3result = await uploadToS3(file.buffer, key, file.mimetype);
    const previewUrl = s3result.url;
    const contentSnippet = await extractContentFromUpload(file.buffer, file.mimetype, file.originalname);
    const assistant = generateAssistantInsight({
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      content: contentSnippet || file.originalname
    });
    const doc = await File.create({
      owner: req.user.id,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder,
      visibility: visibility === 'public' ? 'public' : 'private',
      previewUrl,
      versions: [{ url: previewUrl, label: label || 'Initial upload' }],
      contentSnippet,
      assistant: {
        summary: assistant.summary,
        tags: assistant.tags,
        action: assistant.action
      }
    });

    res.json(doc);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/assistant', async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id });
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (file.owner.toString() !== req.user.id.toString() && file.visibility !== 'public') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(file.assistant || { summary: 'No assistant insight available yet.', tags: ['smart-upload'], action: 'Upload a file to get AI suggestions.' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/ask', async (req, res, next) => {
  try {
    const { question } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id });
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (!question || !question.trim()) return res.status(400).json({ message: 'Question is required' });

    const answer = answerQuestion({
      question,
      fileName: file.name,
      mimeType: file.mimeType,
      size: file.size,
      contentSnippet: file.contentSnippet || ''
    });

    res.json({ answer });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id });
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (file.owner.toString() !== req.user.id.toString() && file.visibility !== 'public') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const url = await generatePresignedUrl(file.previewUrl);
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/share', async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.visibility = 'public';
    file.shareToken = crypto.randomBytes(20).toString('hex');
    await file.save();
    res.json({ shareToken: file.shareToken, visibility: file.visibility });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/rename', async (req, res, next) => {
  try {
    const { name } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id });
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });

    file.name = name.trim();
    await file.save();
    res.json(file);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    await file.deleteOne();
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/folder', async (req, res, next) => {
  try {
    const { name, folder = '/' } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Folder name is required' });

    const newFolder = {
      _id: `${Date.now()}`,
      owner: req.user.id,
      name: name.trim(),
      mimeType: 'application/x-directory',
      size: 0,
      folder,
      visibility: 'private',
      previewUrl: '',
      versions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isFolder: true
    };

    res.json(newFolder);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
