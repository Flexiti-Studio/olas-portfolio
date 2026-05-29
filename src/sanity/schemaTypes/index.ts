import { type SchemaTypeDefinition } from 'sanity'
import { projectType } from './projectType'
import { heroType } from './heroType'
import { aboutType } from './aboutType'
import { skillsType } from './skillsType'
import { serviceType } from './serviceType'
import { experienceType } from './experienceType'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [projectType, heroType, aboutType, skillsType, serviceType, experienceType],
}
