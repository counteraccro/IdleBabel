/**
 * La peinture de la couverture du « Livre sans fin » (maquette .ai/maquette-livre-sans-fin.html, piste A) : la tour
 * qui rapetisse en montant et entre dans les nuages, ses fenêtres allumées, l'escalier qui tourne autour en
 * pointillé, la porte éclairée et un aventurier minuscule ; la lune, les collines, un ciel de crépuscule. Dessinée
 * dans le rectangle (x0, y0, w, h), aux unités de la maquette.
 */

/** Le hasard de la maquette (les mêmes étoiles, les mêmes fenêtres, les mêmes nuages). */
export const rng = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

export const paintTower = (context: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, seed: number): void => {
  context.save();
  context.beginPath();
  context.rect(x0, y0, w, h);
  context.clip();
  const sky = context.createLinearGradient(0, y0, 0, y0 + h);
  sky.addColorStop(0, '#0d1030');
  sky.addColorStop(0.45, '#2c2a5e');
  sky.addColorStop(0.75, '#8a4a5a');
  sky.addColorStop(1, '#e09a5a');
  context.fillStyle = sky;
  context.fillRect(x0, y0, w, h);
  const random = rng(seed);
  for (let i = 0; i < 90; i++) {
    context.fillStyle = `rgba(255,250,230,${0.3 + random() * 0.6})`;
    context.fillRect(x0 + random() * w, y0 + random() * h * 0.45, 1.5, 1.5);
  }
  // La lune et son halo.
  const [mx, my] = [x0 + w * 0.78, y0 + h * 0.2];
  const halo = context.createRadialGradient(mx, my, 10, mx, my, 90);
  halo.addColorStop(0, 'rgba(255,240,200,0.5)');
  halo.addColorStop(1, 'rgba(255,240,200,0)');
  context.fillStyle = halo;
  context.fillRect(mx - 90, my - 90, 180, 180);
  context.fillStyle = '#f6ecc8';
  context.beginPath();
  context.arc(mx, my, 30, 0, Math.PI * 2);
  context.fill();
  // Les collines.
  context.fillStyle = '#1a1424';
  context.beginPath();
  context.moveTo(x0, y0 + h);
  context.lineTo(x0, y0 + h * 0.86);
  for (let x = 0; x <= w; x += 20) context.lineTo(x0 + x, y0 + h * 0.86 - Math.sin(x / 70) * 18 - random() * 6);
  context.lineTo(x0 + w, y0 + h);
  context.fill();
  // La tour, qui rapetisse en montant.
  const [cx, base, top] = [x0 + w * 0.46, y0 + h * 0.9, y0 - 20];
  const half = (y: number): number => 62 - ((base - y) / (base - top)) * 46;
  const body = context.createLinearGradient(cx - 62, 0, cx + 62, 0);
  body.addColorStop(0, '#2a1e2c');
  body.addColorStop(0.55, '#5a4050');
  body.addColorStop(1, '#1a121c');
  context.fillStyle = body;
  context.beginPath();
  context.moveTo(cx - half(base), base);
  context.lineTo(cx - half(top), top);
  context.lineTo(cx + half(top), top);
  context.lineTo(cx + half(base), base);
  context.fill();
  // Les étages, les fenêtres allumées.
  for (let y = base - 30; y > top; y -= 34) {
    const hw = half(y);
    context.strokeStyle = 'rgba(0,0,0,0.35)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cx - hw, y);
    context.lineTo(cx + hw, y);
    context.stroke();
    if (random() < 0.55) {
      const wx = cx - hw * 0.5 + random() * hw;
      context.fillStyle = '#ffcf6a';
      context.shadowColor = '#ffb040';
      context.shadowBlur = 12;
      context.fillRect(wx - 3, y - 20, 6, 11);
      context.shadowBlur = 0;
    }
  }
  // L'escalier qui tourne autour, en pointillé (seulement sur la face qu'on voit).
  context.strokeStyle = 'rgba(240,210,160,0.35)';
  context.lineWidth = 2;
  context.setLineDash([4, 5]);
  context.beginPath();
  for (let y = base; y > top + 60; y -= 2) {
    const t = (base - y) / 52;
    const x = cx + Math.sin(t) * (half(y) + 4);
    if (Math.cos(t) > 0) context.lineTo(x, y);
    else context.moveTo(x, y);
  }
  context.stroke();
  context.setLineDash([]);
  // La porte éclairée.
  context.fillStyle = '#ffcf6a';
  context.beginPath();
  context.moveTo(cx - 12, base);
  context.lineTo(cx - 12, base - 26);
  context.arc(cx, base - 26, 12, Math.PI, 0);
  context.lineTo(cx + 12, base);
  context.fill();
  // L'aventurier, son bâton.
  const [ax, ay] = [cx + 84, base + 30];
  context.save();
  context.fillStyle = '#0c0a10';
  context.translate(ax, ay);
  context.scale(1.8, 1.8);
  context.translate(-ax, -ay);
  context.beginPath();
  context.arc(ax, ay - 22, 3.5, 0, Math.PI * 2);
  context.fill();
  context.fillRect(ax - 3, ay - 19, 6, 13);
  context.fillRect(ax - 3, ay - 7, 2, 8);
  context.fillRect(ax + 1, ay - 7, 2, 8);
  context.fillRect(ax + 4, ay - 26, 1.5, 26);
  context.restore();
  // Les nuages qui avalent le sommet.
  for (let i = 0; i < 26; i++) {
    const [nx, ny, nr] = [x0 + random() * w, y0 + h * (0.02 + random() * 0.2), 30 + random() * 60];
    const cloud = context.createRadialGradient(nx, ny, 0, nx, ny, nr);
    cloud.addColorStop(0, 'rgba(150,140,190,0.55)');
    cloud.addColorStop(1, 'rgba(150,140,190,0)');
    context.fillStyle = cloud;
    context.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
  }
  const fog = context.createLinearGradient(0, y0, 0, y0 + h * 0.18);
  fog.addColorStop(0, 'rgba(70,64,110,1)');
  fog.addColorStop(1, 'rgba(70,64,110,0)');
  context.fillStyle = fog;
  context.fillRect(x0, y0, w, h * 0.18);
  context.restore();
};
