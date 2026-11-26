import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../design/colorful-meal-video-source.mp4');
const originalPhoto = resolve(here, '../../design/healthy-table-source.png');
const target = resolve(here, '../public/media');

function render(args) {
  const result = spawnSync(ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg exited with status ${result.status}`);
}

render(['-i',source,'-vf','scale=1280:720:flags=lanczos,fps=25,format=yuv420p','-c:v','libx264','-crf','19','-preset','medium','-movflags','+faststart','-an',resolve(target,'colorful-meals-hero.mp4')]);
render(['-ss','4','-i',source,'-vf','scale=1280:720:flags=lanczos','-frames:v','1','-q:v','88',resolve(target,'colorful-meals-poster.webp')]);
render(['-i',originalPhoto,'-vf','scale=1280:720','-frames:v','1','-q:v','88',resolve(target,'healthy-table-original.webp')]);
console.log('Hero video, matching poster, and original food photo created in public/media.');
