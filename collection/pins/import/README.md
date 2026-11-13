# GⅠ approved badge import

Upload a **single ZIP file named `g1-approved.zip`** to this exact directory on the `main` branch.

GitHub Actions will:
1. Check the archive for exactly 48 approved WebP images, no unexpected files, valid WebP headers, and matching SHA-256 hashes.
2. Extract the images into `collection/pins/`.
3. Set `g1-manifest.json` to `githubImagesUploaded: true`.
4. Remove the upload ZIP from the current branch to avoid serving it.

Do not upload the ZIP to the repository root or to `assets/badges/step`.

If the workflow fails, the 48-image collection will remain unavailable until the archive is corrected.
