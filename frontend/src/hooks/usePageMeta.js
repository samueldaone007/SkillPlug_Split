import { useEffect } from 'react'

function ensureMeta(attr, key, value) {
  let meta = document.querySelector(`meta[${attr}="${key}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attr, key)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', value)
}

export function usePageMeta(title, description) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
      ? `${title} | SkillPlug`
      : 'SkillPlug - Connect with Nigerian Student Talent'

    if (description) ensureMeta('name', 'description', description)
    if (title) {
      ensureMeta('property', 'og:title', `${title} | SkillPlug`)
      ensureMeta('property', 'og:site_name', 'SkillPlug')
    }
    if (description) ensureMeta('property', 'og:description', description)

    return () => {
      document.title = previousTitle
    }
  }, [title, description])
}