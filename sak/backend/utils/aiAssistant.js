function normalizeText(text = '') {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isTextLike(name, mimeType) {
  const lowerName = (name || '').toLowerCase();
  return (mimeType || '').startsWith('text/') || lowerName.match(/\.(txt|md|mdx|json|xml|csv|js|ts|tsx|jsx|py|java|c|cpp|css|html)$/);
}

function isImageLike(name, mimeType) {
  const lowerName = (name || '').toLowerCase();
  return (mimeType || '').includes('image') || lowerName.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/);
}

function isPdfLike(name, mimeType) {
  const lowerName = (name || '').toLowerCase();
  return (mimeType || '').includes('pdf') || lowerName.endsWith('.pdf');
}

function buildCategory(name, mimeType) {
  const lowerName = (name || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  if (lowerMime.includes('image')) return 'image';
  if (lowerMime.includes('video')) return 'video';
  if (lowerMime.includes('audio')) return 'audio';
  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) return 'document';
  if (lowerMime.includes('spreadsheet') || lowerName.match(/\.(csv|xlsx|xls)$/)) return 'spreadsheet';
  if (lowerMime.includes('presentation') || lowerName.match(/\.(ppt|pptx)$/)) return 'presentation';
  if (lowerName.match(/\.(txt|md|mdx|json|xml|js|ts|tsx|jsx|py|java|c|cpp|css|html|csv)$/)) return 'code-or-text';
  if (lowerMime.includes('zip') || lowerName.match(/\.(zip|rar|tar|gz)$/)) return 'archive';

  return 'file';
}

async function extractContentFromUpload(buffer, mimeType, name) {
  if (!buffer) return '';

  if (isPdfLike(name, mimeType)) {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return String(data.text || '').replace(/\s+/g, ' ').trim();
    } catch (error) {
      return '';
    }
  }

  if (isImageLike(name, mimeType)) {
    try {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();
      return String(text || '').replace(/\s+/g, ' ').trim();
    } catch (error) {
      return '';
    }
  }

  if (isTextLike(name, mimeType)) {
    try {
      const text = buffer.toString('utf8').replace(/\s+/g, ' ').trim();
      return text.slice(0, 1200);
    } catch (error) {
      return '';
    }
  }

  return '';
}

function summarizeText(text = '', maxWords = 60) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No readable content was found in this file.';

  const sentenceMatch = normalized.match(/[^.!?]+[.!?]+/g);
  if (sentenceMatch && sentenceMatch.length > 1) {
    return sentenceMatch.slice(0, 2).join(' ').trim();
  }

  const words = normalized.split(' ');
  if (words.length <= maxWords) return normalized;

  return `${words.slice(0, maxWords).join(' ')}…`;
}

function generateAssistantInsight({ name = 'untitled file', mimeType = '', size = 0, content = '' }) {
  const normalizedName = (name || '').toLowerCase();
  const normalizedContent = normalizeText(content);
  const category = buildCategory(name, mimeType);
  const sizeLabel = size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : size >= 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${size} B`;

  const tags = new Set(['smart-upload']);
  tags.add(category);

  if (normalizedName.match(/project|plan|roadmap|proposal|client|deliverable/)) tags.add('project');
  if (normalizedName.match(/report|summary|notes|meeting|agenda|memo/)) tags.add('work');
  if (normalizedName.match(/invoice|receipt|budget|expense|finance/)) tags.add('finance');
  if (normalizedName.match(/resume|cv|portfolio|cover/)) tags.add('career');
  if (normalizedName.match(/photo|image|screenshot|design|mockup/)) tags.add('design');
  if (normalizedName.match(/video|clip|demo|recording/)) tags.add('media');
  if (normalizedName.match(/code|script|src|app|component|api/)) tags.add('development');

  if (normalizedContent.includes('meeting')) tags.add('meeting');
  if (normalizedContent.includes('invoice') || normalizedContent.includes('budget')) tags.add('finance');
  if (normalizedContent.includes('summary') || normalizedContent.includes('notes')) tags.add('work');
  if (normalizedContent.includes('project')) tags.add('project');

  const primaryTag = [...tags].find((tag) => tag !== 'smart-upload') || 'smart-upload';
  const summary = `${name} looks like a ${category} upload of about ${sizeLabel}. The assistant highlights it as a ${primaryTag} file and suggests keeping it in a clearly named folder.`;

  let action = 'Keep this file in a well-labeled folder for faster retrieval.';
  if (primaryTag === 'project') action = 'Group this file with your project workspace for quick access.';
  if (primaryTag === 'work') action = 'Use this as a collaborative document for team notes or reports.';
  if (primaryTag === 'finance') action = 'Store this in a secure folder for invoices and expense records.';
  if (primaryTag === 'career') action = 'Keep this in your portfolio or job application folder.';
  if (primaryTag === 'design') action = 'Tag this as a visual asset for easy sharing with your team.';
  if (primaryTag === 'development') action = 'Pair this with your codebase or engineering notes.';

  return {
    summary,
    tags: [...tags].slice(0, 6),
    action
  };
}

function answerQuestion({ question = '', fileName = '', mimeType = '', size = 0, contentSnippet = '' }) {
  const normalizedQuestion = normalizeText(question);
  const category = buildCategory(fileName, mimeType);
  const sizeLabel = size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : size >= 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${size} B`;
  const safeSnippet = normalizeText(contentSnippet).slice(0, 220);

  if (!normalizedQuestion) {
    return 'Ask me anything about this file and I will help you understand it.';
  }

  if (normalizedQuestion.includes('summary') || normalizedQuestion.includes('summarize') || normalizedQuestion.includes('what is this') || normalizedQuestion.includes('about') || normalizedQuestion.includes('explain') || normalizedQuestion.includes('tell me')) {
    if (safeSnippet) {
      const summary = summarizeText(safeSnippet, 45);
      return `Here is a concise summary: ${summary}`;
    }
    return `This looks like a ${category} file named ${fileName} with a size of ${sizeLabel}.`;
  }

  if (normalizedQuestion.includes('type') || normalizedQuestion.includes('category') || normalizedQuestion.includes('kind')) {
    return `I would classify ${fileName} as a ${category} file.`;
  }

  if (normalizedQuestion.includes('recommend') || normalizedQuestion.includes('suggest') || normalizedQuestion.includes('should i') || normalizedQuestion.includes('best')) {
    if (category === 'document') {
      return 'A good next step is to keep this document in a project or reports folder and review it before sharing.';
    }
    return 'A practical next step would be to keep this file in a clearly named folder and share it only when needed.';
  }

  if (normalizedQuestion.includes('important') || normalizedQuestion.includes('key') || normalizedQuestion.includes('main') || normalizedQuestion.includes('highlight')) {
    if (safeSnippet) {
      return `The most relevant part of the file appears to be: ${safeSnippet}`;
    }
    return `The file is a ${category} document and it is best organized with a clear name and folder.`;
  }

  if (normalizedQuestion.includes('where') || normalizedQuestion.includes('folder') || normalizedQuestion.includes('store')) {
    return 'I would store it in a folder that matches its purpose, such as projects, documents, or media.';
  }

  if (normalizedQuestion.includes('share') || normalizedQuestion.includes('public') || normalizedQuestion.includes('private')) {
    return 'If this file is sensitive, keep it private and only share it with trusted people.';
  }

  if (normalizedQuestion.includes('image') || normalizedQuestion.includes('ocr') || normalizedQuestion.includes('text')) {
    if (safeSnippet) {
      return `The extracted text from this file looks like: ${safeSnippet}`;
    }
    return 'I can help read text from images and documents, but this upload did not produce readable text.';
  }

  if (contentSnippet) {
    const words = normalizedQuestion.split(/\s+/).filter((word) => word.length > 2);
    const match = words.find((word) => normalizeText(contentSnippet).includes(word));
    if (match) {
      return `I found a likely match for “${match}” in the file content, so it may be relevant to your question.`;
    }
  }

  return `I can help with ${fileName}. I see it as a ${category} file sized around ${sizeLabel}, and I would suggest organizing it with a clear folder name.`;
}

module.exports = {
  generateAssistantInsight,
  extractContentFromUpload,
  summarizeText,
  answerQuestion
};
