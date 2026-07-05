import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplate extends Document {
  name: string;
  sections: {
    profile: string;
    experience: {
      title: string;
      company: string;
      period: string;
      bullets: string[];
    }[];
    skills: {
      frontend: string[];
      backend: string[];
      aiAutomation: string[];
      tools: string[];
    };
    education: {
      degree: string;
      institution: string;
      period: string;
    }[];
  };
  rawText?: string;
  pdfUrl?: string;
  isDefault: boolean;
  createdAt: Date;
}

const TemplateSchema: Schema = new Schema({
  name: { type: String, required: true },
  sections: {
    profile: { type: String },
    experience: [{
      title: { type: String },
      company: { type: String },
      period: { type: String },
      bullets: [{ type: String }]
    }],
    skills: {
      frontend: [{ type: String }],
      backend: [{ type: String }],
      aiAutomation: [{ type: String }],
      tools: [{ type: String }]
    },
    education: [{
      degree: { type: String },
      institution: { type: String },
      period: { type: String }
    }]
  },
  rawText: { type: String },
  pdfUrl: { type: String },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Template || mongoose.model<ITemplate>('Template', TemplateSchema);
