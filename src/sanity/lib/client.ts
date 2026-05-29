import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId, useCdn } from '../env'

export const client = projectId ? createClient({
  apiVersion,
  dataset,
  projectId,
  useCdn,
}) : null;
