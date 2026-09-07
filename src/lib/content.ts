import { getCollection, type CollectionEntry } from 'astro:content';
import { projects, type Project } from '../data/projects';
import type { Lang } from '../i18n/utils';

/** glob loader id'si "tr/traffic-light" biçiminde gelir. */
function langOf(id: string): Lang {
  return id.split('/')[0] as Lang;
}

export interface ProjectPage {
  project: Project;
  entry: CollectionEntry<'projects'>;
}

/**
 * Bir dildeki tüm projeleri, meta verisiyle eşleştirip sıraya dizer.
 * Returns every project for a language, joined with its metadata, in display order.
 */
export async function getProjectPages(lang: Lang): Promise<ProjectPage[]> {
  const entries = await getCollection('projects', (e) => langOf(e.id) === lang);

  const pages = entries.flatMap((entry) => {
    const project = projects.find((p) => p.id === entry.data.projectId);
    // Şema zaten projectId'yi doğruluyor; bu yalnızca tip daraltması.
    return project ? [{ project, entry }] : [];
  });

  return pages.sort((a, b) => a.project.number - b.project.number);
}

export interface GuidePage {
  entry: CollectionEntry<'guides'>;
}

/** Bir dildeki rehberler, `order` alanına göre sıralı. */
export async function getGuidePages(lang: Lang): Promise<CollectionEntry<'guides'>[]> {
  const entries = await getCollection('guides', (e) => langOf(e.id) === lang);
  return entries.sort((a, b) => a.data.order - b.data.order);
}

/**
 * Bir rehberin diğer dildeki slug'ını bulur.
 * Dil değiştiricinin kullanıcıyı 404'e değil, çeviriye götürmesini sağlar.
 */
export async function getGuideAlternateSlug(
  guideId: string,
  targetLang: Lang,
): Promise<string | undefined> {
  const entries = await getCollection('guides', (e) => langOf(e.id) === targetLang);
  return entries.find((e) => e.data.guideId === guideId)?.data.urlSlug;
}
