import { defineField, defineType } from 'sanity'

export const aboutType = defineType({
  name: 'about',
  title: 'About Section',
  type: 'document',
  fields: [
    defineField({
      name: 'headingStart',
      title: 'Heading Start',
      type: 'string',
      description: 'e.g., Building digital',
    }),
    defineField({
      name: 'headingHighlight',
      title: 'Heading Highlight (Gradient Text)',
      type: 'string',
      description: 'e.g., experiences',
    }),
    defineField({
      name: 'headingEnd',
      title: 'Heading End',
      type: 'string',
      description: 'e.g., with code.',
    }),
    defineField({
      name: 'paragraph1',
      title: 'First Paragraph',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'paragraph2',
      title: 'Second Paragraph',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'profileImage',
      title: 'Profile Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'badgeTitle',
      title: 'Floating Badge Title',
      type: 'string',
      description: 'e.g., Available for Work',
    }),
    defineField({
      name: 'badgeSubtitle',
      title: 'Floating Badge Subtitle',
      type: 'string',
      description: 'e.g., Open to Offers',
    }),
    defineField({
      name: 'stats',
      title: 'Statistics',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'value', title: 'Value (e.g., 10+)', type: 'string' },
            { name: 'label', title: 'Label (e.g., Projects Built)', type: 'string' },
            { name: 'icon', title: 'Material Icon Name (e.g., rocket_launch)', type: 'string' },
          ],
        },
      ],
    }),
  ],
})
