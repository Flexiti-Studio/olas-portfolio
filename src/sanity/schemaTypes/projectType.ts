import { defineField, defineType } from 'sanity'

export const projectType = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Project Type',
      type: 'string',
      description: 'e.g., SaaS, Mobile, AI/ML',
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g., Full Stack Developer, Frontend Engineer',
    }),
    defineField({
      name: 'timeline',
      title: 'Timeline',
      type: 'string',
      description: 'e.g., 3 Months (Aug - Oct 2023)',
    }),
    defineField({
      name: 'team',
      title: 'Team Size',
      type: 'string',
      description: 'e.g., Solo, Lead Developer, Team of 4',
    }),
    defineField({
      name: 'challenge',
      title: 'The Challenge',
      type: 'text',
      rows: 5,
    }),
    defineField({
      name: 'solution',
      title: 'The Solution',
      type: 'text',
      rows: 5,
    }),
    defineField({
      name: 'tags',
      title: 'Tags (Tech Stack)',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'liveUrl',
      title: 'Live URL',
      type: 'url',
    }),
    defineField({
      name: 'githubUrl',
      title: 'GitHub URL',
      type: 'url',
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured Project',
      type: 'boolean',
      description: 'Check this to display the project on the homepage.',
      initialValue: false,
    }),
    defineField({
      name: 'image',
      title: 'Main Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'images',
      title: 'Project Gallery / Screenshots',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      description: 'Upload additional screenshots/images for the project details slider.',
    }),
  ],
})
