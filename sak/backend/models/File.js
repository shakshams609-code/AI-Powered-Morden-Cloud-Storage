const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  url: String,
  createdAt: { type: Date, default: Date.now },
  label: String
});

const assistantSchema = new mongoose.Schema({
  summary: { type: String, default: '' },
  tags: [{ type: String }],
  action: { type: String, default: '' }
}, { _id: false });

const fileSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    folder: { type: String, default: '/' },
    visibility: { type: String, enum: ['public', 'private'], default: 'private' },
    shareToken: { type: String, default: '' },
    previewUrl: { type: String, default: '' },
    versions: [versionSchema],
    assistant: assistantSchema,
    contentSnippet: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('File', fileSchema);
