import { useEffect } from 'react'

// Sets the browser tab title to "myFundi Hub | <title>", restoring "myFundi Hub" on unmount.
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `myFundi Hub | ${title}` : 'myFundi Hub'
    return () => { document.title = 'myFundi Hub' }
  }, [title])
}
