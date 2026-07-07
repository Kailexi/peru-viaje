/* ===================================================================
   CLOUDINARY CONFIG — fill this in with YOUR OWN account's values.
   ===================================================================

   This site uses Cloudinary (not Firebase Storage) to host the
   before/after photo uploads, because Cloudinary's free plan needs
   NO credit card at all, while Firebase Storage now requires the
   paid Blaze plan even for free-tier usage.

   1. Go to https://cloudinary.com and click "Sign up free". You can
      sign up with Google/GitHub or an email — no card is asked for.
   2. Once logged in, your "Cloud name" is shown at the top of the
      Dashboard (console.cloudinary.com) — copy it into CLOUD_NAME
      below.
   3. Create an UNSIGNED upload preset so the browser can upload
      images directly without exposing any secret key:
        - Go to Settings (gear icon) → Upload → "Upload presets"
        - Click "Add upload preset"
        - Set "Signing Mode" to "Unsigned"
        - (Optional) set a "Folder" like "notas-de-viaje" to keep
          uploads organized in your Cloudinary media library
        - Save, then copy the preset's name into UPLOAD_PRESET below
   =================================================================== */

const CLOUDINARY_CLOUD_NAME = "acledkpu";
const CLOUDINARY_UPLOAD_PRESET = "notas-de-viaje";
