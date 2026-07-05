import mongoose, { Schema, Document } from 'mongoose';

export interface ICvVersion {
  profile: string;
  experience: {
    title: string;
    company: string;
    period: string;
    bullets: string[];
  }[];
  skillsHighlight: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchScore: number;
  keywordScore: number;
  refinementInstruction?: string;
  createdAt: Date;
}

export interface ICvRecord extends Document {
  jobTitle: string;
  company: string;
  jobDescription: string;
  instructions: string;
  tone: string;
  templateId: mongoose.Types.ObjectId;
  slug: string;
  versions: ICvVersion[];
  currentVersion: number;
  status: 'draft' | 'applied' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const CvVersionSchema = new Schema({
  profile: { type: String },
  experience: [{
    title: { type: String },
    company: { type: String },
    period: { type: String },
    bullets: [{ type: String }]
  }],
  skillsHighlight: { type: String },
  matchedKeywords: [{ type: String }],
  missingKeywords: [{ type: String }],
  matchScore: { type: Number },
  keywordScore: { type: Number },
  refinementInstruction: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const CvRecordSchema: Schema = new Schema({
  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  jobDescription: { type: String },
  instructions: { type: String },
  tone: { type: String },
  templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
  slug: { type: String, required: true, unique: true },
  versions: [CvVersionSchema],
  currentVersion: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'applied', 'archived'], default: 'draft' },
}, { timestamps: true });

export default mongoose.models.CvRecord || mongoose.model<ICvRecord>('CvRecord', CvRecordSchema);
