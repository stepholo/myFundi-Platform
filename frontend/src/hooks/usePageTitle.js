import { useEffect } from 'react'

// Sets the browser tab title to "eFundi | <title>", restoring "eFundi" on unmount.
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `eFundi | ${title}` : 'eFundi'
    return () => { document.title = 'eFundi' }
  }, [title])
}
