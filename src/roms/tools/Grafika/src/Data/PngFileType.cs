using System;
using System.Drawing;
using System.Drawing.Imaging;

namespace PaintDotNet
{
    /// <summary>
    /// Summary description for PngFileType.
    /// </summary>
    public class PngFileType
        : GdiPlusFileType
    {
        public PngFileType()
            : base("PNG", ImageFormat.Png, false, new string[] { ".png" })
        {
        }

        public override bool IsReflexive(SaveConfigToken token)
        {
            return true;
        }
    }
}
