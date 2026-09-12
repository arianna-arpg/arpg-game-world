/** The user's pointed cyan sketch: a straight leading corner and a swept,
 * concave wing. Tint is the existing cursor color, never a second setting. */
export const glimmerForm = (spread: number) =>
  (ctx: CanvasRenderingContext2D, _size: number, color: string): void => {
    const shape = (): void => {
      ctx.beginPath(); ctx.moveTo(3, 3);
      ctx.lineTo(23 + spread, 3);
      ctx.bezierCurveTo(20, 7 + spread, 10, 7, 7, 13 + spread);
      ctx.lineTo(3, 22 + spread); ctx.closePath();
    };
    ctx.save(); ctx.lineJoin = 'round';
    // Dark silhouette for snow; a saturated edge over a deep blue-like core.
    shape(); ctx.strokeStyle = '#0b1424'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = color; ctx.fill();
    const shade = ctx.createLinearGradient(3, 3, 16, 19);
    shade.addColorStop(0, 'rgba(15,20,95,0.65)'); shade.addColorStop(1, 'rgba(5,10,30,0.9)');
    ctx.fillStyle = shade; ctx.fill();
    ctx.shadowColor = color; ctx.shadowBlur = 2;
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(235,250,255,0.65)'; ctx.lineWidth = 0.65;
    ctx.beginPath(); ctx.moveTo(3, 12); ctx.lineTo(3, 3); ctx.lineTo(14, 3); ctx.stroke();
    ctx.restore();
  };
