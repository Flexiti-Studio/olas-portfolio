import { defineField, defineType } from 'sanity'

export const skillsType = defineType({
  name: 'skills',
  title: 'Skills Section',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      description: 'e.g., Technical Skills',
    }),
    defineField({
      name: 'subtitle',
      title: 'Section Subtitle',
      type: 'string',
      description: 'e.g., My tech stack covers the entire spectrum of modern application development.',
    }),
    defineField({
      name: 'categories',
      title: 'Skill Categories',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', title: 'Category Title (e.g., Frontend Development)', type: 'string' },
            { name: 'icon', title: 'Material Icon Name (e.g., desktop_windows)', type: 'string' },
            { 
              name: 'skills', 
              title: 'Skills List', 
              type: 'array', 
              of: [{ type: 'string' }],
              description: 'e.g., React.js, Next.js, Tailwind CSS'
            },
          ],
        },
      ],
    }),
  ],
})
