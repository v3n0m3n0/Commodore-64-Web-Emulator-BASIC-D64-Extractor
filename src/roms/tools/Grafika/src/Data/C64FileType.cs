using System;
using System.IO;
using System.Windows.Forms;

namespace PaintDotNet
{
    [Serializable]
    public class C64FileType
        : FileType,
          ISaveWithProgress
    {
        public C64FileType()
            : base("Commodore 64", true, false, true, new string[] { ".PRG" })
			// HACK, doesn't have support for multiple layers, but put to 'true' anyway, otherwise
			// timanthes will try to flatten the image
        {
        }

		public override SaveConfigToken CreateDefaultSaveConfigToken()
		{
			return new C64SaveConfigToken(95);
		}

		public override SaveConfigWidget CreateSaveConfigWidget()
		{
			return new C64SaveConfigWidget();
		}
		
		public override Document Load(Stream input)
        {
            return Document.FromStream(input);
        }

		public override void Save(Document input, Stream output, SaveConfigToken token)
		{
            C64SaveConfigToken csct = (C64SaveConfigToken)token;

			Type rm1 = ((BitmapLayer)input.Layers[1]).GetRestrictMode.GetType();

			if(rm1 == typeof(RestrictModes.KoalaRestrictMode))					input.SaveBinaryKoala(output, null);
			else if(rm1 == typeof(RestrictModes.SpriteMultiRestrictMode))		input.SaveBinarySpriteMulti(output, null);
			else if(rm1 == typeof(RestrictModes.SpriteSingleRestrictMode))		input.SaveBinarySpriteSingle(output, null);
			else if(rm1 == typeof(RestrictModes.FLI8RestrictMode))				input.SaveBinaryFLI8(output, null);
			else if(rm1 == typeof(RestrictModes.AFLI4RestrictMode))				input.SaveBinaryAFLI4(output, null);
			else if(rm1 == typeof(RestrictModes.AFLI4SpriteMultiRestrictMode))	input.SaveBinaryAFLI4SpriteMulti(output, null);
			else if(rm1 == typeof(RestrictModes.ArtStudioRestrictMode))			input.SaveBinaryHires(output, null);
		}

        public override bool IsReflexive(SaveConfigToken token)
        {
            return false;
        }

        private sealed class UpdateProgressTranslator
        {
            private long maxBytes;
            private long totalBytes;
            private ProgressEventHandler callback;

            public void IOEventHandler(object sender, IOEventArgs e)
            {
                double percent;
                lock (this)
                {
                    totalBytes += (long)e.Count;
                    percent = Math.Max(0.0, Math.Min(100.0, ((double)totalBytes * 100.0) / (double)maxBytes));
                }

                callback(sender, new ProgressEventArgs(percent));
            }

            public UpdateProgressTranslator(long maxBytes, ProgressEventHandler callback)
            {
                this.maxBytes = maxBytes;
                this.callback = callback;
                this.totalBytes = 0;
            }
        }

        /// <summary>
        /// Saves a document and raises events that detail the progress of the operation.
        /// </summary>
        /// <param name="input">The document to save.</param>
        /// <param name="output">The stream to save to.</param>
        /// <param name="parameters">The parameters for the FileType.</param>
        /// <param name="callback">A callback to handle progress events. This event may be raised from any thread.</param>
        public void SaveWithProgress(Document input, Stream output, SaveConfigToken parameters, ProgressEventHandler callback)
        {
            UpdateProgressTranslator upt = new UpdateProgressTranslator(ApproximateMaxOutputOffset(input), callback);

			Type rm1 = ((BitmapLayer)input.Layers[1]).GetRestrictMode.GetType();

			if(rm1 == typeof(RestrictModes.KoalaRestrictMode))					input.SaveBinaryKoala(output, new IOEventHandler(upt.IOEventHandler));
			else if(rm1 == typeof(RestrictModes.SpriteMultiRestrictMode))		input.SaveBinarySpriteMulti(output, new IOEventHandler(upt.IOEventHandler));
			else if(rm1 == typeof(RestrictModes.SpriteSingleRestrictMode))		input.SaveBinarySpriteSingle(output, new IOEventHandler(upt.IOEventHandler));
			else if(rm1 == typeof(RestrictModes.FLI8RestrictMode))				input.SaveBinaryFLI8(output, new IOEventHandler(upt.IOEventHandler));
			else if(rm1 == typeof(RestrictModes.AFLI4RestrictMode))				input.SaveBinaryAFLI4(output, new IOEventHandler(upt.IOEventHandler));
			else if(rm1 == typeof(RestrictModes.AFLI4SpriteMultiRestrictMode))	input.SaveBinaryAFLI4SpriteMulti(output, new IOEventHandler(upt.IOEventHandler));
			else if(rm1 == typeof(RestrictModes.ArtStudioRestrictMode))			input.SaveBinaryHires(output, new IOEventHandler(upt.IOEventHandler));
			else	MessageBox.Show(null, "Incorrect Layer setup for .prg saving", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }

        private long ApproximateMaxOutputOffset(Document measureMe)
        {
            return (long)measureMe.Width * (long)measureMe.Height * (long)ColorBgra.SizeOf;
        }
    }
}
