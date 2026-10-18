-- text-to-image-openrouter: serve the file route's exact-path lookup from an index (review F4).
CREATE UNIQUE INDEX IF NOT EXISTS generation_images_path ON generation_images (path);
