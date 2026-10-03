/**
 * Les petits fers du Manuscrit trouvé à Saragosse, d'après .ai/maquette-saragosse.html (piste A) : la rosace,
 * la palmette Empire, la grecque. Ils servent à la reliure (poussés à l'or) et aux pages (le fleuron de la
 * page de titre, le bandeau des ouvertures).
 */

/** Une rosace à `petals` pétales, avec un bouton au centre. */
export const rosette = (context: CanvasRenderingContext2D, cx: number, cy: number, radius: number, petals = 8): void => {
  for (let petal = 0; petal < petals; petal++) {
    const angle = (petal / petals) * Math.PI * 2;
    context.beginPath();
    context.ellipse(
      cx + Math.cos(angle) * radius * 0.55,
      cy + Math.sin(angle) * radius * 0.55,
      radius * 0.45,
      radius * 0.18,
      angle,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.beginPath();
  context.arc(cx, cy, radius * 0.22, 0, Math.PI * 2);
  context.fill();
};

/** Une palmette Empire : un éventail de cinq feuilles en goutte sur une petite base. Pointe vers le haut. */
export const palmette = (context: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void => {
  context.save();
  context.translate(cx, cy);
  context.scale(scale, scale);
  for (const angle of [-1.0, -0.5, 0, 0.5, 1.0]) {
    context.save();
    context.rotate(angle);
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(-3.2, -5, -2.4, -11, 0, -14 + Math.abs(angle) * 3);
    context.bezierCurveTo(2.4, -11, 3.2, -5, 0, 0);
    context.fill();
    context.restore();
  }
  context.beginPath();
  context.ellipse(0, 2, 4, 1.8, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Une grecque le long d'une bande horizontale de hauteur `height`, de x0 à x1 (motif carré de côté `height`, centré). */
export const meander = (context: CanvasRenderingContext2D, x0: number, x1: number, y: number, height: number): void => {
  const [unit, step] = [height, height / 4];
  const count = Math.floor((x1 - x0) / unit);
  const start = x0 + (x1 - x0 - count * unit) / 2;
  context.beginPath();
  for (let motif = 0; motif < count; motif++) {
    const x = start + motif * unit;
    context.moveTo(x, y + 4 * step);
    context.lineTo(x, y);
    context.lineTo(x + 3 * step, y);
    context.lineTo(x + 3 * step, y + 2 * step);
    context.lineTo(x + step, y + 2 * step);
    context.lineTo(x + step, y + 4 * step);
    context.lineTo(x + 4 * step, y + 4 * step);
  }
  context.stroke();
};

/** Un petit fleuron typographique : une rosace entre deux palmettes couchées. */
export const fleuron = (context: CanvasRenderingContext2D, cx: number, cy: number, scale: number, ink: string): void => {
  context.save();
  context.fillStyle = ink;
  rosette(context, cx, cy, 7 * scale);
  for (const side of [-1, 1]) {
    context.save();
    context.translate(cx + side * 12 * scale, cy);
    context.rotate((side * Math.PI) / 2);
    palmette(context, 0, 0, 0.8 * scale);
    context.restore();
  }
  context.restore();
};
