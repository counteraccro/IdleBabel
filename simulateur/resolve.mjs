export const resolve = async (specifier, context, next) => {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return next(`${specifier}.ts`, context);
    throw error;
  }
};
