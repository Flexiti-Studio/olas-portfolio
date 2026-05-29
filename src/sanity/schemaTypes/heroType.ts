import { defineField, defineType } from 'sanity'

export const heroType = defineType({
  name: 'hero',
  title: 'Hero Section',
  type: 'document',
  fields: [
    defineField({
      name: 'availability',
      title: 'Availability Badge',
      type: 'string',
      description: 'e.g., Available for work',
    }),
    defineField({
      name: 'greeting',
      title: 'Greeting',
      type: 'string',
      description: "e.g., Hi, I'm Ola Olasunkanmi.",
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      description: 'e.g., Building scalable SaaS & AI systems.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description: 'The main paragraph text in the hero section.',
    }),
    defineField({
      name: 'tags',
      title: 'Skills Tags',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'e.g., Full-Stack Developer, SaaS Builder, Mobile Developer',
    }),
  ],
})
