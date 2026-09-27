import { useEffect, useState } from 'react'
import { getTheme, subscribeTheme } from '../utils/theme'

export function useTheme() {
  const [theme, setTheme] = useState(getTheme())

  useEffect(() => subscribeTheme(setTheme), [])

  return theme
}