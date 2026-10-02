// Content schemas: every save in Pages CMS is checked against these when the site builds.
// A missing required field, a bad date or a bad link fails the build, so it can never reach the live site.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** The only two states the repository holds. Review notes and reasons stay in OneDrive. */
const status = z.enum(['published', 'hidden']);

/** Pages CMS can write empty strings or null for empty optional fields: treat them as absent. */
const blank = (v: unknown) => (v === '' || v === null ? undefined : v);
const optText = z.preprocess(blank, z.string().optional());
const optDate = z.preprocess(blank, z.coerce.date().optional());

/** https links, site paths and mailto only; never an Outlook Safelinks address. */
const href = z
  .string()
  .regex(/^(https:\/\/|\/|mailto:)/, 'Use an https:// link, a site path starting with /, or a mailto: link')
  .refine((u) => !/safelinks\.protection\.outlook\.com|[?&]data=/i.test(u), 'Remove the Outlook Safelinks wrapper');

/** An optional "read more" link: dropped when its address is empty. */
const link = z.preprocess(
  (v) => (v && typeof v === 'object' && (v as { url?: unknown }).url ? v : undefined),
  z.object({ text: z.string().min(1, 'Add the link text'), url: href }).optional(),
);

const photos = z.preprocess(
  (v) => (v == null ? [] : v),
  z
    .array(
      z.object({
        src: z.string().min(1),
        alt: z.string().min(1, 'Every photo needs a description for screen readers'),
        caption: optText,
      }),
    )
    .max(3, 'At most three photos per item'),
);

const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '**/*.md' }),
  schema: z
    .object({
      title: z.string().min(1),
      date: z.coerce.date(),
      date_label: optText,
      archived: z.boolean().default(false),
      photos,
      link,
      status,
    })
    .refine((d) => !d.archived || d.link, { message: 'An archived post needs a link to the original', path: ['link'] }),
});

const events = defineCollection({
  loader: glob({ base: './src/content/events', pattern: '**/*.md' }),
  schema: z
    .object({
      title: z.string().min(1),
      start: z.coerce.date(),
      end: optDate,
      when: optText,
      place: optText,
      link,
      status,
    })
    .refine((d) => !d.end || d.end >= d.start, { message: 'The end date is before the start date', path: ['end'] }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1).max(200),
    lead: z.string().min(1),
    invite: z
      .object({
        label: z.string().min(1),
        heading: z.string().min(1),
        text: z.string().min(1),
        links: z.array(z.object({ text: z.string().min(1), url: href })).default([]),
      })
      .optional(),
    cta: z
      .object({
        heading: z.string().min(1),
        text: z.string().min(1),
        button: z.object({ text: z.string().min(1), url: href }),
      })
      .optional(),
  }),
});

export const collections = { news, events, pages };
