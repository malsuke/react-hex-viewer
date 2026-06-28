/** Join truthy class names into a single, space-separated string. */
export const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ')
