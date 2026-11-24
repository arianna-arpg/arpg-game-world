/** Shared by the body and the HUD. Parse a mod's linework only when drawn. */
const paths = new Map<string, Path2D>();
export function statusInkPath(source: string): Path2D {
  let path = paths.get(source);
  if (!path) {
    if (paths.size >= 256) paths.delete(paths.keys().next().value!);
    path = new Path2D(source);
    paths.set(source, path);
  }
  return path;
}
