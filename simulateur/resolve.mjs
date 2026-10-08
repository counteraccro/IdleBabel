export const resolve = async (specifier, context, next) => {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (!specifier.startsWith('.') || specifier.endsWith('.ts')) throw error;
    // Un dossier du jeu (« ../i18n ») : son index.ts.
    return next(`${specifier}.ts`, context).catch(() => next(`${specifier}/index.ts`, context));
  }
};

// Les textes du jeu (i18n/*.json), importés sans « with { type: 'json' } » : Vite s'en passe, Node non.
export const load = (url, context, next) =>
  next(url, url.endsWith('.json') ? { ...context, importAttributes: { ...context.importAttributes, type: 'json' } } : context);
