import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const videoFeed = readFileSync(join(root, 'components/VideoFeed.js'), 'utf8');
const uploadRoute = readFileSync(join(root, 'app/api/videos/upload/route.js'), 'utf8');
const presignedRoute = readFileSync(join(root, 'app/api/videos/presigned-url/route.js'), 'utf8');
const saveMetadataRoute = readFileSync(join(root, 'app/api/videos/save-metadata/route.js'), 'utf8');

test('explore video feed shows a user-facing fallback when native video playback fails', () => {
  assert.match(videoFeed, /onError=\{[^}]*handleVideoError[^}]*\}/, 'VideoFeed <video> must handle playback errors');
  assert.match(videoFeed, /videoError/, 'VideoFeed must track per-video playback errors');
  assert.match(videoFeed, /影片無法播放|影片載入失敗|此影片格式可能不支援/, 'VideoFeed must render a user-facing playback fallback message');
  assert.match(videoFeed, /\.mov|quicktime|isPotentiallyUnsupportedVideoUrl/i, 'VideoFeed should identify MOV/QuickTime as likely unsupported in browsers');
});

test('direct video upload APIs reject MOV QuickTime instead of accepting browser-incompatible files', () => {
  assert.doesNotMatch(uploadRoute, /allowedTypes\s*=\s*\[[^\]]*['"]video\/quicktime['"]/s, 'legacy upload route must not allow video/quicktime');
  assert.doesNotMatch(presignedRoute, /ALLOWED_VIDEO_TYPES\s*=\s*\[[^\]]*['"]video\/quicktime['"]/s, 'presigned upload route must not allow video/quicktime');
  assert.match(uploadRoute, /mp4[^'"`]*webm/i, 'legacy upload error should tell coaches to use MP4 or WebM');
  assert.match(presignedRoute, /mp4[^'"`]*webm/i, 'presigned upload error should tell coaches to use MP4 or WebM');
  assert.match(`${uploadRoute}\n${presignedRoute}`, /MOV|QuickTime|轉成 MP4|轉檔/i, 'upload rejection should explain MOV/QuickTime must be converted');
});

test('save metadata rejects MOV URLs that bypass the direct upload validation path', () => {
  assert.match(saveMetadataRoute, /isBrowserPlayableVideoUrl|isUnsupportedQuickTimeVideoUrl/, 'save-metadata must validate browser-playable video URLs');
  assert.match(saveMetadataRoute, /publicUrl/, 'save-metadata must validate the publicUrl before insert');
  assert.match(saveMetadataRoute, /MOV|QuickTime|轉成 MP4|轉檔/i, 'save-metadata error should explain MOV/QuickTime compatibility');
});
