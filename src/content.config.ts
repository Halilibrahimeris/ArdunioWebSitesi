import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';
import { projects } from './data/projects';

const projectIds = projects.map((p) => p.id);

/**
 * Proje anlatımları / Project write-ups.
 *
 * Dosya yolu dili belirler: src/content/projects/<dil>/<proje-id>.mdx
 * Malzeme, zorluk, süre gibi dilden bağımsız her şey data/projects.ts'te durur —
 * burada yalnızca çeviriye tabi metin var.
 */
const projectDocs = defineCollection({
  loader: glob({ pattern: '{tr,en}/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    /** data/projects.ts içindeki proje kimliği. */
    projectId: z
      .string()
      .refine((id) => projectIds.includes(id), {
        message: `Bilinmeyen projectId. Geçerli değerler / valid ids: ${projectIds.join(', ')}`,
      }),
    title: z.string().min(3),
    summary: z.string().min(10),
    /** "Bu projede öğrenecekleriniz" maddeleri. */
    learn: z.array(z.string()).min(1),
    /** Sorun giderme: soru / cevap çiftleri. */
    troubleshooting: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .default([]),
  }),
});

/**
 * Rehberler / Guides.
 * src/content/guides/<dil>/<dosya>.mdx
 */
const guideDocs = defineCollection({
  loader: glob({ pattern: '{tr,en}/*.mdx', base: './src/content/guides' }),
  schema: z.object({
    /** Her iki dilde aynı olan kimlik — dil değiştirici bunu eşleştirir. */
    guideId: z.string(),
    /** Adres çubuğunda görünecek, dile özgü slug.
     *  NOT: "slug" adını kullanma — Astro onu entry id üretmek için ayırmıştır. */
    urlSlug: z.string(),
    title: z.string().min(3),
    summary: z.string().min(10),
    order: z.number().int().positive(),
  }),
});

export const collections = {
  projects: projectDocs,
  guides: guideDocs,
};
