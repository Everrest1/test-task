export type Path = Array<string | number>

export function getValueAtPath(root: unknown, path: Path): unknown {
  let current: unknown = root
  for (const segment of path) {
    if (current == null) return undefined
    current = (current as Record<string | number, unknown>)[segment]
  }
  return current
}

type Container = Record<string | number, unknown>

export function setValueAtPath(root: unknown, path: Path, value: unknown): void {
  let current = (root ?? {}) as unknown as Container | unknown[]
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i] as string | number
    const child = (current as Container)[segment]
    if (child == null || typeof child !== 'object') {
      (current as Container)[segment] = typeof path[i + 1] === 'number' ? [] : {}
    }
    current = (current as Container)[segment] as Container | unknown[]
  }
  const last = path[path.length - 1] as string | number
  ;(current as Container)[last] = value
}

export function keyOf(path: Path): string {
  return path.join('::')
}