import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribeResize(cb: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", cb)
  window.addEventListener("resize", cb)
  return () => {
    mql.removeEventListener("change", cb)
    window.removeEventListener("resize", cb)
  }
}

function getIsMobileSnapshot(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeResize,
    getIsMobileSnapshot,
    () => false
  )
}
