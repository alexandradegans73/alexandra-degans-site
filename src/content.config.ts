import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Articles du Journal (blog). Un fichier Markdown par article dans src/content/blog/.
 * Le nom du fichier devient l'URL : src/content/blog/mon-article.md → /blog/mon-article
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(90),
    /** Balise title si différente du titre affiché (60 caractères max conseillés) */
    seoTitle: z.string().max(60).optional(),
    description: z.string().min(110).max(158),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** Mot-clé principal visé */
    keyword: z.string(),
    /** Page de soin liée (maillage interne) */
    service: z.enum([
      '/kinesiologie',
      '/memoires-transgenerationnelles',
      '/kinesiologie-animale',
      '/soins-energetiques',
      '/drainage-lymphatique',
    ]),
    /** Image de fond tirée du film de l'arbre */
    scene: z.enum(['arbre', 'branches', 'feuilles', 'racines', 'eau']).default('feuilles'),
    draft: z.boolean().default(false),
  }).refine((d) => (d.seoTitle ?? d.title).length <= 60, { message: 'Titre trop long pour Google : ajouter un seoTitle de 60 caractères maximum.' }),
});

export const collections = { blog };
